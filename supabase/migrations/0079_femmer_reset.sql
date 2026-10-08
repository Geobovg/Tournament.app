-- Femmer: nullstilling uten pakker, mynter, utfordringer og informer.
-- * Alle beholder kortene og laget sitt, men alle kort settes tilbake til 70 med 0 XP.
-- * Pakkene, myntene, oppgradering med mynter, utfordringene og informene er fjernet.
-- * Posisjonsbytter er gratis. Vennesesonger har ingen premie lenger.
-- * Kortene blir fortsatt bedre av XP fra kamper (100 XP = +1).
-- Kamper, AI-stigen og sesongene blir stående.

-- 1) Inform-kortene. Har man vanlig-kortet til samme person, byttes informen ut med det i laget og slettes.
--    Har man bare informen, blir ett av inform-kortene (helst det som står i laget) gjort om til vanlig-kortet.
with keep as (
  select distinct on (card.owner_id, card.person_id) card.id
  from five_cards card left join five_lineups lineup on lineup.user_id = card.owner_id
  where card.inform_id is not null and not exists (
    select 1 from five_cards normal where normal.owner_id = card.owner_id and normal.person_id = card.person_id and normal.inform_id is null
  )
  order by card.owner_id, card.person_id, (card.id = any(coalesce(lineup.starters || lineup.bench, '{}'))) desc, card.overall desc
)
update five_cards set inform_id = null where id in (select id from keep);

do $$
declare
  swap record;
begin
  for swap in
    select inform.id as inform_card, normal.id as normal_card, inform.owner_id
    from five_cards inform
    join five_cards normal on normal.owner_id = inform.owner_id and normal.person_id = inform.person_id and normal.inform_id is null
    where inform.inform_id is not null
  loop
    -- Samme person kan ikke stå to steder, så vanlig-kortet tas ut av benken før det tar informens plass.
    update five_lineups set
      bench = case when swap.inform_card = any(starters || bench) then array_remove(bench, swap.normal_card) else bench end
    where user_id = swap.owner_id;
    update five_lineups set
      starters = array_replace(starters, swap.inform_card, swap.normal_card),
      bench = array_replace(bench, swap.inform_card, swap.normal_card)
    where user_id = swap.owner_id;
  end loop;
end;
$$;
delete from five_cards where inform_id is not null;

drop index if exists five_cards_owner_person_version_idx;
alter table five_cards drop column if exists inform_id;
alter table five_cards add constraint five_cards_owner_id_person_id_key unique (owner_id, person_id);

-- 2) Alle kort tilbake til 70.
update five_cards set overall = 70, xp = 0;

-- 3) Funksjonene for pakker, mynter, utfordringer og informer.
drop function if exists public.open_five_pack(uuid, integer, integer);
drop function if exists public.five_pull_cards(uuid, integer, boolean);
drop function if exists public.ensure_five_inform_round();
drop function if exists public.upgrade_five_card(uuid, uuid);
drop function if exists public.five_upgrade_cost(integer);
drop function if exists public.claim_five_objective(uuid, text, timestamptz, integer, integer, boolean);
drop function if exists public.claim_five_login(uuid);
drop function if exists public.settle_five_match(uuid, integer, integer, integer, integer, jsonb, jsonb);

drop table if exists five_objective_claims;
drop table if exists five_informs;
drop table if exists five_inform_rounds;

-- 4) Posisjonen kan byttes fritt.
create or replace function public.set_five_card_position(target_user uuid, target_card uuid, next_position text)
returns void language plpgsql set search_path = public, pg_temp
as $fn$
begin
  if next_position not in ('GK', 'D', 'M', 'A') then raise exception 'Ugyldig posisjon'; end if;
  update five_cards set position = next_position where id = target_card and owner_id = target_user;
  if not found then raise exception 'Du eier ikke alle kortene'; end if;
end;
$fn$;

-- 5) Gjør opp en ferdig kamp: resultat, erfaring, tabell, AI-stigen og sesongen (som i 0076, uten mynter).
create or replace function public.settle_five_match(
  target_match uuid, score_home integer, score_away integer, stats_home jsonb, stats_away jsonb
) returns boolean language plpgsql set search_path = public, pg_temp
as $fn$
declare
  game five_matches%rowtype;
  home_result text := case when score_home > score_away then 'win' when score_home = score_away then 'draw' else 'loss' end;
begin
  update five_matches set status = 'completed', completed_at = now(), home_score = score_home, away_score = score_away
  where id = target_match and status = 'live'
  returning * into game;
  if not found then return false; end if;

  update five_profiles set
    wins = wins + (home_result = 'win')::int,
    draws = draws + (home_result = 'draw')::int,
    losses = losses + (home_result = 'loss')::int,
    ai_level = case when game.kind = 'ai' and home_result = 'win' and game.ai_level = ai_level then least(30, ai_level + 1) else ai_level end,
    best_ai_level = greatest(best_ai_level, case when game.kind = 'ai' and home_result = 'win' and game.ai_level = ai_level then least(30, ai_level + 1) else ai_level end)
  where user_id = game.home_user_id;
  perform public.five_apply_card_stats(game.home_user_id, stats_home);

  if game.away_user_id is not null then
    update five_profiles set
      wins = wins + (home_result = 'loss')::int,
      draws = draws + (home_result = 'draw')::int,
      losses = losses + (home_result = 'win')::int
    where user_id = game.away_user_id;
    perform public.five_apply_card_stats(game.away_user_id, stats_away);
  end if;

  if game.season_id is not null then
    update five_season_fixtures set status = 'played' where match_id = target_match;
    perform public.finish_five_season(game.season_id);
  end if;
  return true;
end;
$fn$;

-- 6) Avslutter sesongen når siste kamp er spilt og setter sluttplasseringen. Ingen premie.
create or replace function public.finish_five_season(target_season uuid)
returns void language plpgsql set search_path = public, pg_temp
as $fn$
begin
  if exists (select 1 from five_season_fixtures where season_id = target_season and status <> 'played') then return; end if;
  update five_seasons set status = 'completed', completed_at = now() where id = target_season and status = 'active';
  if not found then return; end if;
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
  update five_season_members member set final_rank = ranked.place
  from ranked where member.season_id = target_season and member.user_id = ranked.user_id;
end;
$fn$;

-- 7) Kolonnene for mynter, gratispakken og innloggingsbonusen.
alter table five_profiles drop column if exists coins;
alter table five_profiles drop column if exists last_free_pack_on;
alter table five_profiles drop column if exists login_streak;
alter table five_profiles drop column if exists last_login_on;
alter table five_matches drop column if exists coins;
alter table five_matches drop column if exists away_coins;
alter table five_season_members drop column if exists prize;

revoke all on function public.set_five_card_position(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.settle_five_match(uuid, integer, integer, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.finish_five_season(uuid) from public, anon, authenticated;
grant execute on function public.set_five_card_position(uuid, uuid, text) to service_role;
grant execute on function public.settle_five_match(uuid, integer, integer, jsonb, jsonb) to service_role;
grant execute on function public.finish_five_season(uuid) to service_role;
