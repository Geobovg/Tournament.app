-- Femmer: strammere økonomi.
-- * Gratispakken er fjernet. open_five_pack tar bare imot pakker som koster mynter.
-- * Kampene gir 40 mynter for seier, 15 for uavgjort og 0 for tap (regnes ut i src/lib/femmer/rules.ts).
-- * Oppgradering med mynter starter lavere og blir brattere jo høyere kortet er:
--   60 + 10 per rating over 70 + (rating over 70)². 60 fra 70, 260 fra 80, 660 fra 90, 1124 fra 98.
--   Speiler fiveUpgradeCost i src/lib/femmer/rules.ts.
-- * Posisjonsbytte koster 50 mynter (første valg er fortsatt gratis).
-- * Sesongpremiene er 250, 125 og 60 mynter.
-- * Nye managere starter med 150 mynter.
-- * Innloggingsbonusen er fjernet.

alter table five_profiles alter column coins set default 150;
drop function if exists public.claim_five_login(uuid);

create or replace function public.five_upgrade_cost(current_overall integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select 60 + greatest(0, current_overall - 70) * 10 + greatest(0, current_overall - 70) * greatest(0, current_overall - 70) $fn$;

create or replace function public.open_five_pack(target_user uuid, card_count integer, pack_price integer)
returns jsonb language plpgsql set search_path = public, pg_temp
as $fn$
begin
  if card_count < 1 or card_count > 5 or pack_price <= 0 then raise exception 'Ugyldig pakke'; end if;
  perform 1 from five_profiles where user_id = target_user for update;
  if not found then raise exception 'Du har ikke startet Femmer'; end if;
  update five_profiles set coins = coins - pack_price where user_id = target_user and coins >= pack_price;
  if not found then raise exception 'Du har ikke nok mynter'; end if;
  return public.five_pull_cards(target_user, card_count, false);
end;
$fn$;

create or replace function public.set_five_card_position(target_user uuid, target_card uuid, next_position text)
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  card five_cards%rowtype;
begin
  if next_position not in ('GK', 'D', 'M', 'A') then raise exception 'Ugyldig posisjon'; end if;
  perform 1 from five_profiles where user_id = target_user for update;
  select * into card from five_cards where id = target_card and owner_id = target_user for update;
  if not found then raise exception 'Du eier ikke alle kortene'; end if;
  if card.position = next_position then return; end if;
  -- Første gang er gratis, deretter koster det 50 mynter (FIVE_POSITION_CHANGE_COST i rules.ts).
  if card.position is not null then
    update five_profiles set coins = coins - 50 where user_id = target_user and coins >= 50;
    if not found then raise exception 'Du har ikke nok mynter'; end if;
  end if;
  update five_cards set position = next_position where id = target_card;
end;
$fn$;

-- Som i 0076, men med premiene 250, 125 og 60 (FIVE_SEASON_PRIZES i rules.ts).
create or replace function public.finish_five_season(target_season uuid)
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  member_count integer;
begin
  if exists (select 1 from five_season_fixtures where season_id = target_season and status <> 'played') then return; end if;
  update five_seasons set status = 'completed', completed_at = now() where id = target_season and status = 'active';
  if not found then return; end if;
  select count(*) into member_count from five_season_members where season_id = target_season and status = 'joined';
  with games as (
    select f.home_user_id as user_id, m.home_score as scored, m.away_score as conceded
    from five_season_fixtures f join five_matches m on m.id = f.match_id where f.season_id = target_season
    union all
    select f.away_user_id, m.away_score, m.home_score
    from five_season_fixtures f join five_matches m on m.id = f.match_id where f.season_id = target_season
  ), totals as (
    select member.user_id,
      coalesce(sum(case when g.scored > g.conceded then 3 when g.scored = g.conceded then 1 else 0 end), 0) as points,
      coalesce(sum(g.scored - g.conceded), 0) as diff, coalesce(sum(g.scored), 0) as goals
    from five_season_members member left join games g on g.user_id = member.user_id
    where member.season_id = target_season and member.status = 'joined'
    group by member.user_id
  ), ranked as (
    select user_id, row_number() over (order by points desc, diff desc, goals desc, user_id)::int as place from totals
  )
  update five_season_members member set final_rank = ranked.place,
    prize = case when ranked.place <= least(3, member_count - 1) then (array[250, 125, 60])[ranked.place] else 0 end
  from ranked where member.season_id = target_season and member.user_id = ranked.user_id;
  update five_profiles profile set coins = coins + member.prize
  from five_season_members member where member.season_id = target_season and member.user_id = profile.user_id and member.prize > 0;
end;
$fn$;

revoke all on function public.set_five_card_position(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.finish_five_season(uuid) from public, anon, authenticated;
grant execute on function public.set_five_card_position(uuid, uuid, text) to service_role;
grant execute on function public.finish_five_season(uuid) to service_role;
revoke all on function public.five_upgrade_cost(integer) from public, anon, authenticated;
revoke all on function public.open_five_pack(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.five_upgrade_cost(integer) to service_role;
grant execute on function public.open_five_pack(uuid, integer, integer) to service_role;
