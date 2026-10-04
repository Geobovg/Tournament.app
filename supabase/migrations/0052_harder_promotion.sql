-- Vanskeligere opprykk i AI-sesongen:
-- * Færre direkte opprykk: topp 2 i divisjon 10–7, bare vinneren i divisjon 6–2.
-- * Opprykkskvalik: plassen rett under opprykksplassene spiller én kamp mot en klubb fra divisjonen
--   over. Du må vinne, uavgjort holder ikke.
-- * De to nederste rykker ned (fra divisjon 9 og opp).
-- * AI-klubbene blir 4 bedre for hver divisjon (før 3), og hver divisjon har en klar favoritt.
-- Sesonger som pågår, beholder klubbene sine, men avsluttes etter de nye reglene.

-- Kvalikkampen er en egen kamp i oppsettet som ikke teller i tabellen.
alter table career_season_matches add column if not exists stage text not null default 'league';
alter table career_season_matches drop constraint if exists career_season_matches_stage_check;
alter table career_season_matches add constraint career_season_matches_stage_check check (stage in ('league', 'playoff'));
create unique index if not exists career_season_matches_one_playoff on career_season_matches(ai_season_id) where stage = 'playoff';

-- Reglene samlet ett sted. Speiles i src/lib/season-rules.ts.
create or replace function public.ai_direct_promotion_spots(target_division integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select case when target_division = 1 then 0 when target_division >= 7 then 2 else 1 end $fn$;

create or replace function public.ai_playoff_position(target_division integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select case when target_division = 1 then null else public.ai_direct_promotion_spots(target_division) + 1 end $fn$;

-- Divisjon 10 er fortsatt omtrent på nivå med Academy-troppen (58), men hver divisjon opp gir nå +4.
create or replace function public.ai_division_rating(target_division integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select 58 + (10 - target_division) * 4 $fn$;

create or replace function public.ai_club_names()
returns text[] language sql immutable set search_path = public, pg_temp
as $fn$ select array['Riverside FC', 'Northbridge United', 'Ashford Town', 'Kingsmere City', 'Harbourne Rovers', 'Westbrook Athletic', 'Stonegate FC', 'Redcliffe United',
  'Oakfield Wanderers', 'Blackwater Town', 'Elmstead Albion', 'Highmoor City', 'Castlebury Rangers', 'Millbrook FC', 'Fairhaven Athletic', 'Thornbury United'] $fn$;

-- Tabellen teller bare seriekampene, ikke kvalik.
create or replace function public.season_standings(target_ai_season uuid, target_friend_season uuid)
returns table (participant text, played integer, wins integer, draws integer, losses integer, goals_for integer, goals_against integer, points integer, table_position integer)
language sql stable set search_path = public, pg_temp
as $fn$
  with fixtures as (
    select * from career_season_matches
    where stage = 'league'
      and ((target_ai_season is not null and ai_season_id = target_ai_season)
        or (target_friend_season is not null and friend_season_id = target_friend_season))
  ),
  participants as (
    select coalesce(home_user_id::text, home_ai_key) as participant from fixtures
    union
    select coalesce(away_user_id::text, away_ai_key) from fixtures
  ),
  results as (
    select coalesce(home_user_id::text, home_ai_key) as participant, home_score as gf, away_score as ga from fixtures where status = 'completed'
    union all
    select coalesce(away_user_id::text, away_ai_key), away_score, home_score from fixtures where status = 'completed'
  ),
  totals as (
    select p.participant,
      count(r.gf)::integer as played,
      count(*) filter (where r.gf > r.ga)::integer as wins,
      count(*) filter (where r.gf = r.ga)::integer as draws,
      count(*) filter (where r.gf < r.ga)::integer as losses,
      coalesce(sum(r.gf), 0)::integer as goals_for,
      coalesce(sum(r.ga), 0)::integer as goals_against
    from participants p left join results r on r.participant = p.participant
    group by p.participant
  )
  select participant, played, wins, draws, losses, goals_for, goals_against, wins * 3 + draws as points,
    (row_number() over (order by wins * 3 + draws desc, goals_for - goals_against desc, goals_for desc, participant))::integer as table_position
  from totals
$fn$;

-- Nye AI-sesonger: fire klubber rundt divisjonsnivået og én favoritt som er klart bedre.
create or replace function public.create_ai_season(target_user uuid, target_division integer, target_number integer)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  picked text[];
  base integer := public.ai_division_rating(target_division);
  offsets integer[] := array[-2, -1, 0, 1, 5];
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
  select array_agg(name) into picked from (select unnest(public.ai_club_names()) as name order by random() limit 5) as chosen;
  for i in 1..5 loop
    teams := teams || jsonb_build_object('key', 'ai' || i, 'name', picked[i], 'rating', base + offsets[i]);
  end loop;

  insert into career_ai_seasons (user_id, season_number, division, teams)
  values (target_user, target_number, target_division, teams)
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

-- Sesongslutt. Havner du på kvalikplassen, settes kvalikkampen opp og sesongen står åpen til den er spilt.
-- Plasseringspremien ganges opp jo høyere divisjonen er, og opprykk gir en egen bonus som vokser for hver divisjon.
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
  position_budget integer;
  promotion_budget integer := 0;
  promotion_pack text;
  new_division integer;
  opponent_name text;
begin
  select * into season_row from career_ai_seasons where id = target_season for update;
  if not found or season_row.status <> 'active' then return; end if;
  if exists (select 1 from career_season_matches where ai_season_id = target_season and stage = 'league' and status <> 'completed') then return; end if;

  select table_position into user_position from public.season_standings(target_season, null) where participant = season_row.user_id::text;

  select * into playoff from career_season_matches where ai_season_id = target_season and stage = 'playoff';
  if found then
    if playoff.status <> 'completed' then return; end if;
    -- Brukeren står alltid som hjemmelag i kvalikkampen. Bare seier gir opprykk.
    next_outcome := case when playoff.home_score > playoff.away_score then 'promoted' else 'stayed' end;
  elsif user_position = public.ai_playoff_position(season_row.division) then
    -- Motstanderen er en klubb fra divisjonen over som ikke er med i serien.
    select name into opponent_name from unnest(public.ai_club_names()) as name
    where name not in (select entry.team->>'name' from jsonb_array_elements(season_row.teams) as entry(team))
    order by random() limit 1;
    update career_ai_seasons
    set teams = teams || jsonb_build_array(jsonb_build_object('key', 'kv', 'name', opponent_name, 'rating', public.ai_division_rating(season_row.division - 1) + 1))
    where id = target_season;
    insert into career_season_matches (ai_season_id, round, stage, home_user_id, away_ai_key)
    values (target_season, 11, 'playoff', season_row.user_id, 'kv');
    return;
  else
    next_outcome := case
      when user_position <= public.ai_direct_promotion_spots(season_row.division) then 'promoted'
      when user_position >= 5 and season_row.division < 10 then 'relegated'
      else 'stayed' end;
  end if;

  update career_ai_seasons set status = 'completed', final_position = user_position, outcome = next_outcome, completed_at = now() where id = target_season;

  position_budget := floor((array[30, 20, 15, 10, 5, 0])[user_position] * (1 + (10 - season_row.division) * 0.5));
  if position_budget > 0 then
    insert into career_reward_events (user_id, source_type, source_id, reward_key, manager_budget)
    values (season_row.user_id, 'ai_season', target_season, 'position_' || user_position, position_budget)
    on conflict (user_id, source_type, source_id, reward_key) do nothing;
    if found then
      update player_profiles set manager_budget = manager_budget + position_budget, manager_budget_earned = manager_budget_earned + position_budget, updated_at = now() where user_id = season_row.user_id;
    end if;
  end if;

  if next_outcome = 'promoted' then
    new_division := season_row.division - 1;
    promotion_budget := 25 * (11 - new_division);
    promotion_pack := case when new_division = 1 then 'elite' when new_division <= 3 then 'gull' when new_division <= 6 then 'solv' end;
    insert into career_reward_events (user_id, source_type, source_id, reward_key, manager_budget)
    values (season_row.user_id, 'ai_season', target_season, 'promotion_d' || new_division, promotion_budget)
    on conflict (user_id, source_type, source_id, reward_key) do nothing;
    if found then
      update player_profiles set manager_budget = manager_budget + promotion_budget, manager_budget_earned = manager_budget_earned + promotion_budget, updated_at = now() where user_id = season_row.user_id;
      if promotion_pack is not null then
        insert into manager_pack_inventory (user_id, pack_key, quantity) values (season_row.user_id, promotion_pack, 1)
        on conflict (user_id, pack_key) do update set quantity = manager_pack_inventory.quantity + 1, updated_at = now();
      end if;
    end if;
  end if;

  perform public.grant_club_xp(season_row.user_id, 50 + (10 - season_row.division) * 10);
  -- Neste sesong starter med en gang, så «Spill neste kamp» aldri står tom.
  perform public.ensure_ai_season(season_row.user_id);
end;
$fn$;

revoke all on function public.ai_direct_promotion_spots(integer) from public, anon, authenticated;
revoke all on function public.ai_playoff_position(integer) from public, anon, authenticated;
revoke all on function public.ai_club_names() from public, anon, authenticated;
grant execute on function public.ai_direct_promotion_spots(integer) to service_role;
grant execute on function public.ai_playoff_position(integer) to service_role;
grant execute on function public.ai_club_names() to service_role;
