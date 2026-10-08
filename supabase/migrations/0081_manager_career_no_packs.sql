-- Managerkarrieren uten pakker, og en ny nullstilling.
-- * Pakkene er borte: de kan ikke kjøpes eller åpnes, og ingen premie gir pakker. Pakkebutikken er fjernet fra appen.
-- * Bare opprykk i AI-sesongen gir premie (MB). Plassering, ny arena, klubbnivå, vennesesonger og SBC gir
--   ingenting lenger, og SBC er slått av.
-- * Nullstilling: alle kort (også spesialkort), lag, annonser, bud og pakker slettes. Alle får 120 MB og
--   Academy-troppen. Det personlige kortet beholdes, settes til 70 og legges på benken.
-- * Alle starter i divisjon 10 på Gamle Gress. Pågående AI-sesonger slettes, ferdige blir stående i historikken.
-- * Klubbnivå, XP, kamphistorikk, turneringer og Femmer røres ikke.

-- 1) Ingen pakker. Alle veier som åpner en pakke, går gjennom deliver_manager_pack.
update manager_packs set purchasable = false;

create or replace function public.deliver_manager_pack(target_user uuid, target_pack text, paid boolean)
returns jsonb language plpgsql set search_path = public, pg_temp
as $fn$
begin
  raise exception 'Pakker finnes ikke lenger';
end;
$fn$;

create or replace function public.grant_pack(target_user uuid, target_pack text, amount integer)
returns void language sql set search_path = public, pg_temp
as $fn$ select $fn$;

-- 2) SBC er slått av.
update sbc_challenges set active = false;

-- 3) Bare opprykk gir premie.
create or replace function public.finish_ai_season(target_season uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  season_row career_ai_seasons%rowtype;
  playoff career_season_matches%rowtype;
  user_position integer;
  next_outcome text;
  factor numeric;
  new_arena integer;
  new_division integer;
  opponent_name text;
  opponent_arena integer;
  opponent_division integer;
begin
  select * into season_row from career_ai_seasons where id = target_season for update;
  if not found or season_row.status <> 'active' then return; end if;
  if exists (select 1 from career_season_matches where ai_season_id = target_season and stage = 'league' and status <> 'completed') then return; end if;
  factor := public.ai_arena_factor(season_row.arena);

  select table_position into user_position from public.season_standings(target_season, null) where participant = season_row.user_id::text;

  select * into playoff from career_season_matches where ai_season_id = target_season and stage = 'playoff';
  if found then
    if playoff.status <> 'completed' then return; end if;
    -- Brukeren står alltid som hjemmelag i kvalikkampen. Står det likt etter ekstraomgangene, avgjør straffene.
    next_outcome := case
      when playoff.home_score > playoff.away_score then 'promoted'
      when playoff.home_score = playoff.away_score and exists (
        select 1 from career_matches m
        where m.id = playoff.match_id and m.home_penalties > m.away_penalties
      ) then 'promoted'
      else 'stayed' end;
  elsif user_position = public.ai_playoff_position(season_row.arena, season_row.division) then
    -- Motstanderen er en klubb fra divisjonen over, eller fra divisjon 10 i neste arena.
    if season_row.division = 1 then opponent_arena := season_row.arena + 1; opponent_division := 10;
    else opponent_arena := season_row.arena; opponent_division := season_row.division - 1; end if;
    select name into opponent_name from unnest(public.ai_club_names()) as name
    where name not in (select entry.team->>'name' from jsonb_array_elements(season_row.teams) as entry(team))
    order by random() limit 1;
    update career_ai_seasons
    set teams = teams || jsonb_build_array(jsonb_build_object('key', 'kv', 'name', opponent_name,
      'rating', least(99, public.ai_division_rating(opponent_arena, opponent_division) + 1), 'bonus', public.ai_arena_bonus(opponent_arena)))
    where id = target_season;
    insert into career_season_matches (ai_season_id, round, stage, home_user_id, away_ai_key)
    values (target_season, 11, 'playoff', season_row.user_id, 'kv');
    return;
  else
    next_outcome := case
      when user_position = 1 and season_row.division = 1 and season_row.arena >= 5 then 'champion'
      when user_position <= public.ai_direct_promotion_spots(season_row.arena, season_row.division) then 'promoted'
      when user_position >= 5 and season_row.division < 10 then 'relegated'
      else 'stayed' end;
  end if;

  update career_ai_seasons set status = 'completed', final_position = user_position, outcome = next_outcome, completed_at = now() where id = target_season;

  -- Bare opprykk gir premie, og bare MB. Plasseringen og en ny arena gir ingenting.
  if next_outcome = 'promoted' and season_row.division > 1 then
    new_division := season_row.division - 1;
    perform public.grant_season_budget(season_row.user_id, target_season, 'promotion_d' || new_division, floor(25 * (11 - new_division) * factor)::integer);
  elsif next_outcome = 'promoted' then
    new_arena := season_row.arena + 1;
    perform public.grant_season_budget(season_row.user_id, target_season, 'promotion_a' || new_arena, floor(25 * 11 * factor)::integer);
    insert into career_arena_unlocks (user_id, arena) values (season_row.user_id, new_arena) on conflict do nothing;
  end if;

  perform public.grant_club_xp(season_row.user_id, floor((50 + (10 - season_row.division) * 10) * factor)::integer);
  -- Neste sesong starter med en gang, så «Spill neste kamp» aldri står tom.
  perform public.ensure_ai_season(season_row.user_id);
end;
$fn$;
-- Klubbnivå gir ingen belønning lenger, bare nivået.
create or replace function public.grant_club_xp(target_user uuid, amount integer)
returns integer
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  old_xp integer;
begin
  if amount <= 0 then return 0; end if;
  select club_xp into old_xp from player_profiles where user_id = target_user for update;
  if not found then return 0; end if;
  update player_profiles set club_xp = old_xp + amount, updated_at = now() where user_id = target_user;
  return public.club_level_for_xp(old_xp + amount);
end;
$fn$;

-- Vennesesonger gir ingen premie lenger.
create or replace function public.finish_friend_season(target_season uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  standing record;
  leader_points integer;
  best_chaser integer;
begin
  perform 1 from career_friend_seasons where id = target_season and status = 'active' for update;
  if not found then return; end if;
  if exists (select 1 from career_season_matches where friend_season_id = target_season and status <> 'completed') then
    if exists (select 1 from career_season_matches where friend_season_id = target_season and status = 'live') then return; end if;
    select s.points into leader_points from public.season_standings(null, target_season) s where s.table_position = 1;
    select max(s.points + 3 * (
      select count(*) from career_season_matches m
      where m.friend_season_id = target_season and m.stage = 'league' and m.status <> 'completed'
        and (m.home_user_id::text = s.participant or m.away_user_id::text = s.participant)
    ))::integer into best_chaser
    from public.season_standings(null, target_season) s where s.table_position > 1;
    if leader_points is null or best_chaser is null or leader_points <= best_chaser then return; end if;
    delete from career_season_matches where friend_season_id = target_season and status = 'scheduled';
  end if;
  update career_friend_seasons set status = 'completed', completed_at = now() where id = target_season;
  for standing in select * from public.season_standings(null, target_season) loop
    update career_friend_season_members set final_position = standing.table_position where season_id = target_season and user_id = standing.participant::uuid;
  end loop;
end;
$fn$;

revoke all on function public.deliver_manager_pack(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.grant_pack(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.finish_ai_season(uuid) from public, anon, authenticated;
revoke all on function public.grant_club_xp(uuid, integer) from public, anon, authenticated;
revoke all on function public.finish_friend_season(uuid) from public, anon, authenticated;

-- 4) Nullstillingen.
update career_challenges set status = 'expired' where status in ('pending', 'accepted');
delete from market_bids;
delete from market_listings;
delete from manager_lineups;
delete from manager_cards card where not exists (select 1 from personal_cards personal where personal.card_id = card.id);
delete from manager_pack_inventory;
update player_profiles set manager_budget = 120, manager_budget_earned = 120, updated_at = now();

update personal_cards set ladder_start = 0, counted_from = now();
update manager_cards card set overall = 70, attributes = public.personal_card_attributes(70), location = 'squad'
from personal_cards personal where personal.card_id = card.id;

delete from career_ai_seasons where status = 'active';
delete from career_arena_unlocks;

do $$
declare
  profile_id uuid;
begin
  for profile_id in select user_id from player_profiles loop
    perform public.seed_manager_starter_squad(profile_id);
    perform public.create_ai_season(profile_id, 1, 10,
      coalesce((select max(season_number) from career_ai_seasons where user_id = profile_id), 0) + 1);
  end loop;
end $$;
