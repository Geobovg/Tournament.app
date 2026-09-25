-- Sesonger i managerkarrieren. Løse enkeltkamper får en rød tråd:
-- * AI-sesong: du og fem AI-klubber spiller dobbel serie (10 kamper for deg). Topp 3 rykker opp,
--   sistemann rykker ned. Ti divisjoner, der divisjon 10 er lavest og divisjon 1 høyest.
-- * Vennesesong: en gjeng venner der alle møter alle én gang.
-- AI-motstandere er ikke brukere, så career_matches får plass til en AI-borteside.

-- AI-kamper har ingen motstanderbruker. Brukeren står alltid som hjemmelag i selve kampen.
alter table career_matches alter column away_user_id drop not null;
alter table career_matches add column if not exists away_ai_name text;
alter table career_matches drop constraint if exists career_matches_away_side_check;
alter table career_matches add constraint career_matches_away_side_check check (away_user_id is not null or away_ai_name is not null);

create table if not exists career_ai_seasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  season_number integer not null check (season_number >= 1),
  division integer not null check (division between 1 and 10),
  status text not null default 'active' check (status in ('active', 'completed')),
  -- De fem AI-klubbene: [{ "key": "ai1", "name": "...", "rating": 61 }, ...]
  teams jsonb not null,
  final_position integer check (final_position between 1 and 6),
  outcome text check (outcome in ('promoted', 'relegated', 'stayed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, season_number)
);
create unique index if not exists career_ai_seasons_one_active on career_ai_seasons(user_id) where status = 'active';

create table if not exists career_friend_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  created_by uuid not null references profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'active', 'completed')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists career_friend_season_members (
  season_id uuid not null references career_friend_seasons(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'joined')),
  final_position integer,
  joined_at timestamptz,
  primary key (season_id, user_id)
);
create index if not exists career_friend_season_members_user_idx on career_friend_season_members(user_id);

-- Kampoppsettet for begge sesongtypene. En side er enten en bruker eller en AI-klubb (nøkkel fra teams).
create table if not exists career_season_matches (
  id uuid primary key default gen_random_uuid(),
  ai_season_id uuid references career_ai_seasons(id) on delete cascade,
  friend_season_id uuid references career_friend_seasons(id) on delete cascade,
  round integer not null check (round >= 1),
  home_user_id uuid references profiles(id) on delete cascade,
  away_user_id uuid references profiles(id) on delete cascade,
  home_ai_key text,
  away_ai_key text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed')),
  match_id uuid unique references career_matches(id) on delete set null,
  home_score integer,
  away_score integer,
  completed_at timestamptz,
  check ((ai_season_id is null) <> (friend_season_id is null)),
  check ((home_user_id is null) <> (home_ai_key is null)),
  check ((away_user_id is null) <> (away_ai_key is null))
);
create index if not exists career_season_matches_ai_idx on career_season_matches(ai_season_id, round);
create index if not exists career_season_matches_friend_idx on career_season_matches(friend_season_id, round);

alter table career_ai_seasons enable row level security;
alter table career_friend_seasons enable row level security;
alter table career_friend_season_members enable row level security;
alter table career_season_matches enable row level security;

-- Sesongbelønninger lagres som egne hendelser.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'career_reward_events'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%source_type%'
  loop
    execute format('alter table career_reward_events drop constraint %I', constraint_name);
  end loop;
end $$;
alter table career_reward_events add constraint career_reward_events_source_type_check check (source_type in (
  'starter', 'tournament_match', 'tournament_champion', 'tournament_finalist', 'career_match', 'market_sale', 'club_level', 'ai_season', 'friend_season'
));

-- AI-klubbenes styrke: divisjon 10 er omtrent på nivå med Academy-troppen (59), hver divisjon opp gir +3.
create or replace function public.ai_division_rating(target_division integer)
returns integer language sql immutable set search_path = public, pg_temp
as $fn$ select 58 + (10 - target_division) * 3 $fn$;

-- Tabellen for en sesong. Deltaker er bruker-id som tekst eller AI-nøkkelen.
create or replace function public.season_standings(target_ai_season uuid, target_friend_season uuid)
returns table (participant text, played integer, wins integer, draws integer, losses integer, goals_for integer, goals_against integer, points integer, position integer)
language sql stable set search_path = public, pg_temp
as $fn$
  with fixtures as (
    select * from career_season_matches
    where (target_ai_season is not null and ai_season_id = target_ai_season)
       or (target_friend_season is not null and friend_season_id = target_friend_season)
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
    (row_number() over (order by wins * 3 + draws desc, goals_for - goals_against desc, goals_for desc, participant))::integer as position
  from totals
$fn$;

-- Lager en ny AI-sesong med fem tilfeldige AI-klubber og ferdig kampoppsett (dobbel serie, 10 runder).
create or replace function public.create_ai_season(target_user uuid, target_division integer, target_number integer)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  club_names text[] := array['Fjordby FK', 'Nordvik IL', 'Bølgen SK', 'Granli BK', 'Solstad FK', 'Havøy IL', 'Myrvang SK', 'Tindheim FK',
    'Elvebakken IL', 'Skogsrud BK', 'Kvitberg FK', 'Løvøya SK', 'Steinvik IL', 'Aurdal FK', 'Brattli BK', 'Vesthavn FK'];
  picked text[];
  base integer := public.ai_division_rating(target_division);
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
  select array_agg(name) into picked from (select unnest(club_names) as name order by random() limit 5) as chosen;
  for i in 1..5 loop
    teams := teams || jsonb_build_object('key', 'ai' || i, 'name', picked[i], 'rating', base + (i - 3));
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

-- Henter brukerens aktive AI-sesong, eller starter en. Første sesong er alltid i divisjon 10.
create or replace function public.ensure_ai_season(target_user uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  season_id uuid;
  last_season career_ai_seasons%rowtype;
  next_division integer := 10;
begin
  perform 1 from player_profiles where user_id = target_user for update;
  select id into season_id from career_ai_seasons where user_id = target_user and status = 'active';
  if season_id is not null then return season_id; end if;
  select * into last_season from career_ai_seasons where user_id = target_user order by season_number desc limit 1;
  if found then
    next_division := case last_season.outcome
      when 'promoted' then greatest(1, last_season.division - 1)
      when 'relegated' then least(10, last_season.division + 1)
      else last_season.division end;
  end if;
  return public.create_ai_season(target_user, next_division, coalesce(last_season.season_number, 0) + 1);
end;
$fn$;

-- Enkel resultatmodell for AI mot AI: styrkeforskjellen vipper sjansene, men alt kan skje.
create or replace function public.simulate_ai_goals(own_rating integer, other_rating integer)
returns integer language sql volatile set search_path = public, pg_temp
as $fn$
  select least(6, greatest(0, floor(random() * 3.2 + (own_rating - other_rating) / 8.0 + random() * 0.8)::integer))
$fn$;

-- Belønning ved sesongslutt. Plasseringspremien ganges opp jo høyere divisjonen er,
-- og opprykk gir en egen bonus som vokser for hver divisjon man når.
create or replace function public.finish_ai_season(target_season uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  season_row career_ai_seasons%rowtype;
  user_position integer;
  next_outcome text;
  position_budget integer;
  promotion_budget integer := 0;
  promotion_pack text;
  new_division integer;
begin
  select * into season_row from career_ai_seasons where id = target_season for update;
  if not found or season_row.status <> 'active' then return; end if;
  if exists (select 1 from career_season_matches where ai_season_id = target_season and status <> 'completed') then return; end if;

  select position into user_position from public.season_standings(target_season, null) where participant = season_row.user_id::text;
  next_outcome := case
    when user_position <= 3 and season_row.division > 1 then 'promoted'
    when user_position = 6 and season_row.division < 10 then 'relegated'
    else 'stayed' end;

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

-- Vennesesongen avsluttes når alle har møtt alle. De tre beste får premie.
create or replace function public.finish_friend_season(target_season uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  standing record;
  reward_budget integer;
begin
  perform 1 from career_friend_seasons where id = target_season and status = 'active' for update;
  if not found then return; end if;
  if exists (select 1 from career_season_matches where friend_season_id = target_season and status <> 'completed') then return; end if;
  update career_friend_seasons set status = 'completed', completed_at = now() where id = target_season;
  for standing in select * from public.season_standings(null, target_season) loop
    update career_friend_season_members set final_position = standing.position where season_id = target_season and user_id = standing.participant::uuid;
    reward_budget := case standing.position when 1 then 100 when 2 then 50 when 3 then 25 else 0 end;
    if reward_budget > 0 then
      insert into career_reward_events (user_id, source_type, source_id, reward_key, manager_budget)
      values (standing.participant::uuid, 'friend_season', target_season, 'position_' || standing.position, reward_budget)
      on conflict (user_id, source_type, source_id, reward_key) do nothing;
      if found then
        update player_profiles set manager_budget = manager_budget + reward_budget, manager_budget_earned = manager_budget_earned + reward_budget, updated_at = now() where user_id = standing.participant::uuid;
        if standing.position = 1 then
          insert into manager_pack_inventory (user_id, pack_key, quantity) values (standing.participant::uuid, 'gull', 1)
          on conflict (user_id, pack_key) do update set quantity = manager_pack_inventory.quantity + 1, updated_at = now();
        end if;
      end if;
    end if;
  end loop;
end;
$fn$;

-- Kalles når en sesongkamp er ferdig: fører resultatet inn i oppsettet, simulerer AI-kampene i samme
-- runde og avslutter sesongen når alt er spilt.
create or replace function public.record_season_match_result(target_match uuid, home_goals integer, away_goals integer)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  fixture career_season_matches%rowtype;
  season_row career_ai_seasons%rowtype;
  other career_season_matches%rowtype;
  home_rating integer;
  away_rating integer;
  user_is_home boolean;
begin
  select * into fixture from career_season_matches where match_id = target_match for update;
  if not found or fixture.status = 'completed' then return; end if;

  -- I selve kampen står brukeren alltid hjemme. I oppsettet kan brukeren være bortelag.
  user_is_home := fixture.home_user_id is not null and (fixture.ai_season_id is null or fixture.home_ai_key is null);
  if fixture.ai_season_id is not null and not user_is_home then
    update career_season_matches set status = 'completed', home_score = away_goals, away_score = home_goals, completed_at = now() where id = fixture.id;
  else
    update career_season_matches set status = 'completed', home_score = home_goals, away_score = away_goals, completed_at = now() where id = fixture.id;
  end if;

  if fixture.ai_season_id is not null then
    select * into season_row from career_ai_seasons where id = fixture.ai_season_id;
    for other in select * from career_season_matches where ai_season_id = fixture.ai_season_id and round = fixture.round and status = 'scheduled' and home_ai_key is not null and away_ai_key is not null for update loop
      select (entry.team->>'rating')::integer into home_rating from jsonb_array_elements(season_row.teams) as entry(team) where entry.team->>'key' = other.home_ai_key;
      select (entry.team->>'rating')::integer into away_rating from jsonb_array_elements(season_row.teams) as entry(team) where entry.team->>'key' = other.away_ai_key;
      -- Hjemmebane gir et lite løft.
      update career_season_matches
      set status = 'completed', home_score = public.simulate_ai_goals(home_rating + 1, away_rating), away_score = public.simulate_ai_goals(away_rating, home_rating + 1), completed_at = now()
      where id = other.id;
    end loop;
    perform public.finish_ai_season(fixture.ai_season_id);
  else
    perform public.finish_friend_season(fixture.friend_season_id);
  end if;
end;
$fn$;

-- Oppgjøret tåler nå AI-motstandere (away_user_id er tom), og sesongkamper føres inn i tabellen.
create or replace function public.settle_finished_manager_matches(target_match uuid default null)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  match_row career_matches%rowtype;
  home_goals integer;
  away_goals integer;
  shot_count integer;
  planned_seconds numeric;
  match_winner uuid;
  settled_count integer := 0;
begin
  for match_row in
    select *
    from career_matches
    where mode = 'manager'
      and status = 'live'
      and started_at <= now() - interval '135 seconds'
      and (target_match is null or id = target_match)
    order by started_at asc
    for update skip locked
  loop
    select count(*) into shot_count
    from jsonb_array_elements(match_row.events) as event(value)
    where event.value ->> 'type' = 'shot';

    planned_seconds := 135 + shot_count * 10;
    if match_row.started_at > now() - make_interval(secs => planned_seconds) then
      continue;
    end if;

    select
      count(*) filter (where goal.event ->> 'side' = 'home'),
      count(*) filter (where goal.event ->> 'side' = 'away')
    into home_goals, away_goals
    from jsonb_array_elements(match_row.events) as goal(event)
    where goal.event ->> 'type' = 'goal';

    home_goals := home_goals + (select count(*) from career_match_shots where match_id = match_row.id and side = 'home' and outcome = 'goal');
    away_goals := away_goals + (select count(*) from career_match_shots where match_id = match_row.id and side = 'away' and outcome = 'goal');

    -- Vinner mot AI blir stående tom, akkurat som uavgjort. Resultatet leses av målene.
    match_winner := case
      when home_goals = away_goals then null
      when home_goals > away_goals then match_row.home_user_id
      else match_row.away_user_id
    end;

    update career_matches
    set
      status = 'completed',
      home_score = home_goals,
      away_score = away_goals,
      winner_id = match_winner,
      completed_at = now(),
      events = case
        when exists (
          select 1 from jsonb_array_elements(match_row.events) as event
          where event ->> 'type' = 'full_time'
        ) then match_row.events
        else match_row.events || jsonb_build_array(jsonb_build_object(
          'type', 'full_time',
          'minute', 90,
          'homeScore', home_goals,
          'awayScore', away_goals
        ))
      end
    where id = match_row.id and status = 'live';

    if not found then
      continue;
    end if;

    if match_row.challenge_id is not null then
      update career_challenges
      set status = 'completed'
      where id = match_row.challenge_id and status <> 'completed';
    end if;

    if home_goals = away_goals then
      perform award_manager_match_result(match_row.home_user_id, match_row.id, 'manager_draw', 2, 'manager_career_draws');
      if match_row.away_user_id is not null then
        perform award_manager_match_result(match_row.away_user_id, match_row.id, 'manager_draw', 2, 'manager_career_draws');
      end if;
    else
      if home_goals > away_goals then
        perform award_manager_match_result(match_row.home_user_id, match_row.id, 'manager_win', 5, 'manager_career_wins');
        if match_row.away_user_id is not null then
          perform award_manager_match_result(match_row.away_user_id, match_row.id, 'manager_loss', 0, 'manager_career_losses');
        end if;
      else
        perform award_manager_match_result(match_row.home_user_id, match_row.id, 'manager_loss', 0, 'manager_career_losses');
        if match_row.away_user_id is not null then
          perform award_manager_match_result(match_row.away_user_id, match_row.id, 'manager_win', 5, 'manager_career_wins');
        end if;
      end if;
    end if;

    perform public.record_season_match_result(match_row.id, home_goals, away_goals);

    settled_count := settled_count + 1;
  end loop;

  return settled_count;
end;
$$;

-- Starter vennesesongen: bare de som har blitt med er med, og alle møter alle én gang.
create or replace function public.start_friend_season(target_user uuid, target_season uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  season_row career_friend_seasons%rowtype;
  players uuid[];
  player_count integer;
  slots uuid[];
  slot_count integer;
  round_index integer;
  pair_index integer;
  home_player uuid;
  away_player uuid;
begin
  select * into season_row from career_friend_seasons where id = target_season for update;
  if not found or season_row.created_by <> target_user then raise exception 'Bare den som opprettet sesongen kan starte den'; end if;
  if season_row.status <> 'open' then raise exception 'Sesongen er allerede i gang'; end if;
  delete from career_friend_season_members where season_id = target_season and status <> 'joined';
  select array_agg(user_id order by random()) into players from career_friend_season_members where season_id = target_season;
  player_count := coalesce(array_length(players, 1), 0);
  if player_count < 2 then raise exception 'Minst to managere må ha blitt med'; end if;

  -- Oddetall får en «fri runde» (null), så sirkelmetoden går opp.
  slots := case when player_count % 2 = 1 then players || array[null::uuid] else players end;
  slot_count := array_length(slots, 1);
  for round_index in 0..slot_count - 2 loop
    for pair_index in 0..slot_count / 2 - 1 loop
      home_player := slots[pair_index + 1];
      away_player := slots[slot_count - pair_index];
      if home_player is not null and away_player is not null then
        if round_index % 2 = 1 then
          insert into career_season_matches (friend_season_id, round, home_user_id, away_user_id) values (target_season, round_index + 1, away_player, home_player);
        else
          insert into career_season_matches (friend_season_id, round, home_user_id, away_user_id) values (target_season, round_index + 1, home_player, away_player);
        end if;
      end if;
    end loop;
    -- Roter alle unntatt første plass.
    slots := array[slots[1]] || array[slots[slot_count]] || slots[2:slot_count - 1];
  end loop;

  update career_friend_seasons set status = 'active', started_at = now() where id = target_season;
end;
$fn$;

-- Alle som har spilt managerkarrieren får en AI-sesong i divisjon 10 med en gang.
do $$ declare profile_id uuid; begin for profile_id in select user_id from player_profiles loop perform public.ensure_ai_season(profile_id); end loop; end $$;

revoke all on function public.ai_division_rating(integer) from public, anon, authenticated;
revoke all on function public.season_standings(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_ai_season(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.ensure_ai_season(uuid) from public, anon, authenticated;
revoke all on function public.simulate_ai_goals(integer, integer) from public, anon, authenticated;
revoke all on function public.finish_ai_season(uuid) from public, anon, authenticated;
revoke all on function public.finish_friend_season(uuid) from public, anon, authenticated;
revoke all on function public.record_season_match_result(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.settle_finished_manager_matches(uuid) from public, anon, authenticated;
revoke all on function public.start_friend_season(uuid, uuid) from public, anon, authenticated;
grant execute on function public.ai_division_rating(integer) to service_role;
grant execute on function public.season_standings(uuid, uuid) to service_role;
grant execute on function public.create_ai_season(uuid, integer, integer) to service_role;
grant execute on function public.ensure_ai_season(uuid) to service_role;
grant execute on function public.simulate_ai_goals(integer, integer) to service_role;
grant execute on function public.finish_ai_season(uuid) to service_role;
grant execute on function public.finish_friend_season(uuid) to service_role;
grant execute on function public.record_season_match_result(uuid, integer, integer) to service_role;
grant execute on function public.settle_finished_manager_matches(uuid) to service_role;
grant execute on function public.start_friend_season(uuid, uuid) to service_role;
