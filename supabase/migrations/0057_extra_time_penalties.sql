-- Kvalikkampen til opprykk må ha en vinner. Står det likt etter 90′, spilles ekstraomganger
-- (91′–120′), og står det fortsatt likt, avgjøres kampen i en simulert straffekonkurranse.
-- Hele forløpet planlegges ved avspark (kickoff.knockout = true); her telles det bare opp.

alter table career_matches add column if not exists home_penalties integer;
alter table career_matches add column if not exists away_penalties integer;

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
  knockout boolean;
  extra_time boolean := false;
  home_pens integer;
  away_pens integer;
  kick_count integer := 0;
  match_result integer;
  settled_count integer := 0;
begin
  for match_row in
    select *
    from career_matches
    where mode = 'manager'
      and status = 'live'
      and started_at <= now() - interval '65 seconds'
      and (target_match is null or id = target_match)
    order by started_at asc
    for update skip locked
  loop
    select count(*) into shot_count
    from jsonb_array_elements(match_row.events) as event(value)
    where event.value ->> 'type' = 'shot';

    knockout := exists (
      select 1 from jsonb_array_elements(match_row.events) as event(value)
      where event.value ->> 'type' = 'kickoff' and coalesce((event.value ->> 'knockout')::boolean, false)
    );
    extra_time := false;
    kick_count := 0;
    home_pens := null;
    away_pens := null;

    -- Ordinær tid: mål til og med 90′ pluss skuddene spilleren selv tok.
    select
      count(*) filter (where goal.event ->> 'side' = 'home'),
      count(*) filter (where goal.event ->> 'side' = 'away')
    into home_goals, away_goals
    from jsonb_array_elements(match_row.events) as goal(event)
    where goal.event ->> 'type' = 'goal' and (goal.event ->> 'minute')::int <= 90;

    home_goals := home_goals + (select count(*) from career_match_shots where match_id = match_row.id and side = 'home' and outcome = 'goal');
    away_goals := away_goals + (select count(*) from career_match_shots where match_id = match_row.id and side = 'away' and outcome = 'goal');

    -- En utslagskamp som står likt etter 90′ går til ekstraomganger (91′–120′), og deretter straffer.
    -- Samme regel som matchExtension i manager-match.ts, så visningen og resultatet alltid stemmer.
    if knockout and home_goals = away_goals then
      extra_time := true;
      home_goals := home_goals + (select count(*) from jsonb_array_elements(match_row.events) as goal(event)
        where goal.event ->> 'type' = 'goal' and goal.event ->> 'side' = 'home' and (goal.event ->> 'minute')::int between 91 and 120);
      away_goals := away_goals + (select count(*) from jsonb_array_elements(match_row.events) as goal(event)
        where goal.event ->> 'type' = 'goal' and goal.event ->> 'side' = 'away' and (goal.event ->> 'minute')::int between 91 and 120);

      if home_goals = away_goals then
        select
          count(*),
          count(*) filter (where kick.value ->> 'side' = 'home' and (kick.value ->> 'scored')::boolean),
          count(*) filter (where kick.value ->> 'side' = 'away' and (kick.value ->> 'scored')::boolean)
        into kick_count, home_pens, away_pens
        from jsonb_array_elements(match_row.events) as kick(value)
        where kick.value ->> 'type' = 'shootout_kick';
        if kick_count = 0 then
          home_pens := null;
          away_pens := null;
        end if;
      end if;
    end if;

    -- Lengden i sekunder speiler plannedDurationMs: 24 sek ekstraomganger med pauser, 4 sek før straffene og 3 per spark.
    planned_seconds := 65 + shot_count * 10
      + case when extra_time then 24 else 0 end
      + case when kick_count > 0 then 4 + kick_count * 3 else 0 end;
    if match_row.started_at > now() - make_interval(secs => planned_seconds) then
      continue;
    end if;

    -- 1 = hjemmeseier, -1 = borteseier, 0 = uavgjort. Bortelaget kan være en AI-klubb uten bruker-id,
    -- så utfallet holdes adskilt fra winner_id.
    match_result := case
      when home_goals > away_goals then 1
      when home_goals < away_goals then -1
      when home_pens is not null and home_pens > away_pens then 1
      when home_pens is not null and home_pens < away_pens then -1
      else 0
    end;

    match_winner := case
      when match_result = 1 then match_row.home_user_id
      when match_result = -1 then match_row.away_user_id
      else null
    end;

    update career_matches
    set
      status = 'completed',
      home_score = home_goals,
      away_score = away_goals,
      winner_id = match_winner,
      home_penalties = home_pens,
      away_penalties = away_pens,
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
          'awayScore', away_goals,
          'extraTime', extra_time,
          'homePenalties', home_pens,
          'awayPenalties', away_pens
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

    if match_result = 0 then
      perform award_manager_match_result(match_row.home_user_id, match_row.id, 'manager_draw', 2, 'manager_career_draws');
      if match_row.away_user_id is not null then
        perform award_manager_match_result(match_row.away_user_id, match_row.id, 'manager_draw', 2, 'manager_career_draws');
      end if;
    else
      if match_result = 1 then
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

revoke all on function public.settle_finished_manager_matches(uuid) from public, anon, authenticated;
grant execute on function public.settle_finished_manager_matches(uuid) to service_role;

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
    -- Brukeren står alltid som hjemmelag i kvalikkampen. Står det likt etter ekstraomgangene, avgjør straffene.
    next_outcome := case
      when playoff.home_score > playoff.away_score then 'promoted'
      when playoff.home_score = playoff.away_score and exists (
        select 1 from career_matches m
        where m.id = playoff.match_id and m.home_penalties > m.away_penalties
      ) then 'promoted'
      else 'stayed' end;
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
