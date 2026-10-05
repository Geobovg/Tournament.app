-- Arenaer i AI-sesongen, som i Clash Royale: fem stadioner med ti divisjoner hver, 50 nivåer i alt.
--   1 Gamle Gress · 2 Ullevaal · 3 Wembley Stadium · 4 Old Trafford · 5 Camp Nou
-- * Vinner du divisjon 1, går du opp til divisjon 10 i neste arena. Nr. 2 spiller kvalik mot en klubb fra
--   divisjon 10 i neste arena. Divisjon 10 er gulvet i hver arena, så du faller aldri ut av en arena du har nådd.
-- * Vinner du divisjon 1 på Camp Nou, blir du der og får en mestertittel.
-- * AI-ratingen går jevnt fra divisjon 10 til divisjon 1 i hver arena: 58–84, 82–87, 86–90, 88–94 og 91–97.
--   Fra arena 2 er AI-klubbene jevnere, de har en skjult styrkebonus i kampmodellen (+1 til +4) og
--   spillerne kan være opptil 99. Tallene speiles i src/lib/arenas.ts.
-- * Premiene ganges med en arena-faktor (1, 1,5, 2, 2,5, 3). Seier i divisjon 1 gir like mange
--   elitepakker som arenanummeret, og første gang du når en ny arena får du en egen belønning.
-- * Inform-sjansen i vanlige pakker løftes litt jo høyere arena du er i.
-- Sesonger som pågår, beholder kampene sine, men AI-klubbene får ratingen fra den nye kurven.

alter table career_ai_seasons add column if not exists arena integer not null default 1 check (arena between 1 and 5);

do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'career_ai_seasons'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%outcome%'
  loop
    execute format('alter table career_ai_seasons drop constraint %I', constraint_name);
  end loop;
end $$;
alter table career_ai_seasons add constraint career_ai_seasons_outcome_check check (outcome in ('promoted', 'relegated', 'stayed', 'champion'));

-- Arenaene man har nådd. Belønningen for en ny arena gis bare når raden lages.
create table if not exists career_arena_unlocks (
  user_id uuid not null references profiles(id) on delete cascade,
  arena integer not null check (arena between 2 and 5),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, arena)
);
alter table career_arena_unlocks enable row level security;

-- 1) Tallene for hver arena. Speiles i src/lib/arenas.ts.
create or replace function public.ai_division_rating(target_arena integer, target_division integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$
  select (array[58, 82, 86, 88, 91])[target_arena]
    + round(((array[84, 87, 90, 94, 97])[target_arena] - (array[58, 82, 86, 88, 91])[target_arena]) * (10 - target_division) / 9.0)::integer
$fn$;

-- Den gamle varianten uten arena regnes som arena 1.
create or replace function public.ai_division_rating(target_division integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select public.ai_division_rating(1, target_division) $fn$;

create or replace function public.ai_team_offsets(target_arena integer)
returns integer[] language sql immutable set search_path = public, pg_temp
as $fn$
  select case target_arena
    when 1 then array[-2, -1, 0, 1, 5]
    when 2 then array[-2, -1, 0, 1, 3]
    when 3 then array[-1, 0, 0, 1, 2]
    when 4 then array[-1, 0, 1, 1, 2]
    else array[0, 0, 1, 1, 2] end
$fn$;

create or replace function public.ai_arena_bonus(target_arena integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select greatest(0, least(target_arena, 5) - 1) $fn$;

create or replace function public.ai_arena_factor(target_arena integer)
returns numeric language sql immutable set search_path = public, pg_temp
as $fn$ select (array[1, 1.5, 2, 2.5, 3]::numeric[])[target_arena] $fn$;

create or replace function public.ai_arena_inform_factor(target_arena integer)
returns numeric language sql immutable set search_path = public, pg_temp
as $fn$ select (array[1, 1.05, 1.1, 1.15, 1.25]::numeric[])[target_arena] $fn$;

create or replace function public.ai_arena_promotion_packs(target_arena integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select (array[1, 1, 2, 2, 3])[target_arena] $fn$;

-- Opprykk: topp 2 i divisjon 10–7, bare vinneren i divisjon 6–1. I divisjon 1 går vinneren til neste arena
-- (på Camp Nou blir det mestertittel). Plassen rett under spiller kvalik, unntatt i divisjon 1 på Camp Nou.
create or replace function public.ai_direct_promotion_spots(target_arena integer, target_division integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select case when target_division >= 7 then 2 else 1 end $fn$;

create or replace function public.ai_playoff_position(target_arena integer, target_division integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select case when target_division = 1 and target_arena >= 5 then null else public.ai_direct_promotion_spots(target_arena, target_division) + 1 end $fn$;

drop function if exists public.ai_direct_promotion_spots(integer);
drop function if exists public.ai_playoff_position(integer);

-- Arenaen manageren er i nå: den aktive AI-sesongen, ellers den siste.
create or replace function public.manager_arena(target_user uuid)
returns integer language sql stable set search_path = public, pg_temp
as $fn$
  select coalesce((select arena from career_ai_seasons where user_id = target_user order by (status = 'active') desc, season_number desc limit 1), 1)
$fn$;

create or replace function public.manager_inform_factor(target_user uuid)
returns numeric language sql stable set search_path = public, pg_temp
as $fn$ select public.ai_arena_inform_factor(public.manager_arena(target_user)) $fn$;

-- 2) Nye AI-sesonger har en arena. Klubbene får arenaens avvik og skjulte bonus.
drop function if exists public.create_ai_season(uuid, integer, integer);
create or replace function public.create_ai_season(target_user uuid, target_arena integer, target_division integer, target_number integer)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  picked text[];
  base integer := public.ai_division_rating(target_arena, target_division);
  offsets integer[] := public.ai_team_offsets(target_arena);
  bonus integer := public.ai_arena_bonus(target_arena);
  teams jsonb := '[]';
  season_id uuid;
  -- Deltaker 0 er brukeren, 1–5 er AI-klubbene.
  rotation integer[];
  lineup integer[];
  round_index integer;
  pair_index integer;
  a integer;
  b integer;
  home_part integer;
  away_part integer;
begin
  select array_agg(name) into picked from (select name from unnest(public.ai_club_names()) as name order by random() limit 5) as chosen;
  for i in 1..5 loop
    teams := teams || jsonb_build_object('key', 'ai' || i, 'name', picked[i], 'rating', least(99, base + offsets[i]), 'bonus', bonus);
  end loop;

  insert into career_ai_seasons (user_id, season_number, arena, division, teams)
  values (target_user, target_number, target_arena, target_division, teams)
  returning id into season_id;

  -- Rundkast med sirkelmetoden: deltaker 0 står fast, resten roterer. Andre halvdel speiler første med byttet hjemmebane.
  rotation := array[1, 2, 3, 4, 5];
  for round_index in 0..4 loop
    lineup := array[0] || rotation[(round_index % 5) + 1:5] || rotation[1:(round_index % 5)];
    for pair_index in 0..2 loop
      a := lineup[pair_index + 1];
      b := lineup[6 - pair_index];
      if (round_index + pair_index) % 2 = 0 then home_part := a; away_part := b; else home_part := b; away_part := a; end if;
      insert into career_season_matches (ai_season_id, round, home_user_id, home_ai_key, away_user_id, away_ai_key)
      values (season_id, round_index + 1,
        case when home_part = 0 then target_user end, case when home_part <> 0 then 'ai' || home_part end,
        case when away_part = 0 then target_user end, case when away_part <> 0 then 'ai' || away_part end);
      insert into career_season_matches (ai_season_id, round, home_user_id, home_ai_key, away_user_id, away_ai_key)
      values (season_id, round_index + 6,
        case when away_part = 0 then target_user end, case when away_part <> 0 then 'ai' || away_part end,
        case when home_part = 0 then target_user end, case when home_part <> 0 then 'ai' || home_part end);
    end loop;
  end loop;

  return season_id;
end;
$fn$;

-- Neste sesong: opp en divisjon, eller til divisjon 10 i neste arena etter opprykk fra divisjon 1.
-- Mesteren blir på Camp Nou divisjon 1. Nedrykk går aldri under divisjon 10 i arenaen.
create or replace function public.ensure_ai_season(target_user uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  season_id uuid;
  last_season career_ai_seasons%rowtype;
  next_arena integer := 1;
  next_division integer := 10;
begin
  perform 1 from player_profiles where user_id = target_user for update;
  select id into season_id from career_ai_seasons where user_id = target_user and status = 'active';
  if season_id is not null then return season_id; end if;
  select * into last_season from career_ai_seasons where user_id = target_user order by season_number desc limit 1;
  if found then
    next_arena := last_season.arena;
    next_division := last_season.division;
    if last_season.outcome = 'promoted' and last_season.division = 1 then
      next_arena := least(5, last_season.arena + 1); next_division := 10;
    elsif last_season.outcome = 'promoted' then
      next_division := last_season.division - 1;
    elsif last_season.outcome = 'relegated' then
      next_division := least(10, last_season.division + 1);
    end if;
  end if;
  return public.create_ai_season(target_user, next_arena, next_division, coalesce(last_season.season_number, 0) + 1);
end;
$fn$;

create or replace function public.grant_pack(target_user uuid, target_pack text, amount integer)
returns void language sql set search_path = public, pg_temp
as $fn$
  insert into manager_pack_inventory (user_id, pack_key, quantity) select target_user, target_pack, amount where amount > 0
  on conflict (user_id, pack_key) do update set quantity = manager_pack_inventory.quantity + excluded.quantity, updated_at = now();
$fn$;

create or replace function public.grant_season_budget(target_user uuid, target_season uuid, target_key text, amount integer)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  insert into career_reward_events (user_id, source_type, source_id, reward_key, manager_budget)
  values (target_user, 'ai_season', target_season, target_key, greatest(amount, 0))
  on conflict (user_id, source_type, source_id, reward_key) do nothing;
  if not found then return false; end if;
  if amount > 0 then
    update player_profiles set manager_budget = manager_budget + amount, manager_budget_earned = manager_budget_earned + amount, updated_at = now() where user_id = target_user;
  end if;
  return true;
end;
$fn$;

-- 3) Sesongslutt med arenaer.
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
  promotion_pack text;
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

  perform public.grant_season_budget(season_row.user_id, target_season, 'position_' || user_position,
    floor((array[30, 20, 15, 10, 5, 0])[user_position] * (1 + (10 - season_row.division) * 0.5) * factor)::integer);

  -- Seier i divisjon 1: like mange elitepakker som arenanummeret.
  if user_position = 1 and season_row.division = 1 then
    if public.grant_season_budget(season_row.user_id, target_season, 'division_one_win', 0) then
      perform public.grant_pack(season_row.user_id, 'elite', season_row.arena);
    end if;
  end if;

  if next_outcome = 'promoted' and season_row.division > 1 then
    new_division := season_row.division - 1;
    promotion_pack := case when new_division = 1 then 'elite' when new_division <= 3 then 'gull' when new_division <= 6 then 'solv' end;
    if public.grant_season_budget(season_row.user_id, target_season, 'promotion_d' || new_division, floor(25 * (11 - new_division) * factor)::integer)
      and promotion_pack is not null then
      perform public.grant_pack(season_row.user_id, promotion_pack, public.ai_arena_promotion_packs(season_row.arena));
    end if;
  elsif next_outcome = 'promoted' then
    -- Opp til neste arena. Første gang gir arenaen en egen belønning.
    new_arena := season_row.arena + 1;
    perform public.grant_season_budget(season_row.user_id, target_season, 'promotion_a' || new_arena, floor(25 * 11 * factor)::integer);
    insert into career_arena_unlocks (user_id, arena) values (season_row.user_id, new_arena) on conflict do nothing;
    if found then
      perform public.grant_season_budget(season_row.user_id, target_season, 'arena_unlock_' || new_arena, (array[0, 300, 500, 750, 1000])[new_arena]);
      if new_arena = 2 then perform public.grant_pack(season_row.user_id, 'elite', 1);
      else perform public.grant_pack(season_row.user_id, 'inform', case when new_arena = 5 then 2 else 1 end); end if;
    end if;
  end if;

  perform public.grant_club_xp(season_row.user_id, floor((50 + (10 - season_row.division) * 10) * factor)::integer);
  -- Neste sesong starter med en gang, så «Spill neste kamp» aldri står tom.
  perform public.ensure_ai_season(season_row.user_id);
end;
$fn$;

-- 4) Sesonger som pågår, får ratingene fra den nye kurven. Spilte kamper står som de er.
update career_ai_seasons season
set teams = (
  select jsonb_agg(
    case
      when entry.team->>'key' = 'kv' then entry.team || jsonb_build_object('rating', least(99, public.ai_division_rating(case when season.division = 1 then 2 else 1 end, case when season.division = 1 then 10 else season.division - 1 end) + 1))
      else entry.team || jsonb_build_object('rating', least(99, public.ai_division_rating(1, season.division) + (public.ai_team_offsets(1))[least(5, greatest(1, substring(entry.team->>'key' from 3)::integer))]))
    end order by entry.ord)
  from jsonb_array_elements(season.teams) with ordinality as entry(team, ord)
)
where season.status = 'active';

revoke all on function public.ai_division_rating(integer, integer) from public, anon, authenticated;
revoke all on function public.ai_division_rating(integer) from public, anon, authenticated;
revoke all on function public.ai_team_offsets(integer) from public, anon, authenticated;
revoke all on function public.ai_arena_bonus(integer) from public, anon, authenticated;
revoke all on function public.ai_arena_factor(integer) from public, anon, authenticated;
revoke all on function public.ai_arena_inform_factor(integer) from public, anon, authenticated;
revoke all on function public.ai_arena_promotion_packs(integer) from public, anon, authenticated;
revoke all on function public.ai_direct_promotion_spots(integer, integer) from public, anon, authenticated;
revoke all on function public.ai_playoff_position(integer, integer) from public, anon, authenticated;
revoke all on function public.manager_arena(uuid) from public, anon, authenticated;
revoke all on function public.manager_inform_factor(uuid) from public, anon, authenticated;
revoke all on function public.create_ai_season(uuid, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.ensure_ai_season(uuid) from public, anon, authenticated;
revoke all on function public.grant_pack(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.grant_season_budget(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.finish_ai_season(uuid) from public, anon, authenticated;
grant execute on function public.ai_division_rating(integer, integer) to service_role;
grant execute on function public.ai_division_rating(integer) to service_role;
grant execute on function public.ai_team_offsets(integer) to service_role;
grant execute on function public.ai_arena_bonus(integer) to service_role;
grant execute on function public.ai_arena_factor(integer) to service_role;
grant execute on function public.ai_arena_inform_factor(integer) to service_role;
grant execute on function public.ai_arena_promotion_packs(integer) to service_role;
grant execute on function public.ai_direct_promotion_spots(integer, integer) to service_role;
grant execute on function public.ai_playoff_position(integer, integer) to service_role;
grant execute on function public.manager_arena(uuid) to service_role;
grant execute on function public.manager_inform_factor(uuid) to service_role;
grant execute on function public.create_ai_season(uuid, integer, integer, integer) to service_role;
grant execute on function public.ensure_ai_season(uuid) to service_role;
grant execute on function public.grant_pack(uuid, text, integer) to service_role;
grant execute on function public.grant_season_budget(uuid, uuid, text, integer) to service_role;
grant execute on function public.finish_ai_season(uuid) to service_role;
