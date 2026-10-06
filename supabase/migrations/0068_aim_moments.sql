-- Nøkkeløyeblikk (kampversjon 5): skytteren sikter selv og keeperen redder selv.
--
-- Hver kamp har seks øyeblikk. Skytteren lagrer hvor han siktet (aim_x/aim_y, der 0–1 er
-- stolpe til stolpe og bakke til tverrligger), og keeperen hvor han kastet seg og hvor mange
-- millisekunder etter skuddet (save_x/save_y/save_ms). Utfallet regnes ut i appen av de to
-- valgene, akkurat som før, og telles her som mål i career_match_shots.
--
-- Byttevinduet på 70′ er fjernet fra versjon 5, så kampen er ti sekunder kortere, og hvert
-- øyeblikk tar sju sekunder i stedet for ti. Oppgjøret leser versjonen fra avsparket.

alter table career_match_shots drop constraint if exists career_match_shots_kind_check;
alter table career_match_shots add constraint career_match_shots_kind_check check (kind in ('penalty', 'chance', 'freekick', 'longshot'));

alter table career_match_shots
  add column if not exists aim_x real,
  add column if not exists aim_y real,
  add column if not exists save_x real,
  add column if not exists save_y real,
  add column if not exists save_ms integer;

-- Første valg gjelder, som i record_shot_choice: et nytt trykk overskriver aldri det som alt er
-- lagret, og raden røres ikke etter at utfallet er avgjort.
create or replace function public.record_shot_aim(
  target_match uuid,
  target_minute integer,
  target_kind text,
  target_side text,
  target_role text,
  target_x real,
  target_y real,
  target_ms integer
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if target_role not in ('shooter', 'keeper') then
    raise exception 'Ukjent rolle';
  end if;

  insert into career_match_shots (match_id, minute, kind, side, aim_x, aim_y, save_x, save_y, save_ms)
  values (
    target_match,
    target_minute,
    target_kind,
    target_side,
    case when target_role = 'shooter' then target_x end,
    case when target_role = 'shooter' then target_y end,
    case when target_role = 'keeper' then target_x end,
    case when target_role = 'keeper' then target_y end,
    case when target_role = 'keeper' then target_ms end
  )
  on conflict (match_id, minute) do update
  set
    aim_x = case when target_role = 'shooter' and career_match_shots.aim_x is null then excluded.aim_x else career_match_shots.aim_x end,
    aim_y = case when target_role = 'shooter' and career_match_shots.aim_x is null then excluded.aim_y else career_match_shots.aim_y end,
    save_x = case when target_role = 'keeper' and career_match_shots.save_x is null then excluded.save_x else career_match_shots.save_x end,
    save_y = case when target_role = 'keeper' and career_match_shots.save_x is null then excluded.save_y else career_match_shots.save_y end,
    save_ms = case when target_role = 'keeper' and career_match_shots.save_x is null then excluded.save_ms else career_match_shots.save_ms end
  where career_match_shots.outcome is null;
end;
$$;

revoke all on function public.record_shot_aim(uuid, integer, text, text, text, real, real, integer) from public, anon, authenticated;
grant execute on function public.record_shot_aim(uuid, integer, text, text, text, real, real, integer) to service_role;

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
  match_version integer;
  match_result integer;
  settled_count integer := 0;
begin
  for match_row in
    select *
    from career_matches
    where mode = 'manager'
      and status = 'live'
      and started_at <= now() - interval '55 seconds'
      and (target_match is null or id = target_match)
    order by started_at asc
    for update skip locked
  loop
    select count(*) into shot_count
    from jsonb_array_elements(match_row.events) as event(value)
    where event.value ->> 'type' = 'shot';

    match_version := coalesce((
      select (event.value ->> 'version')::int from jsonb_array_elements(match_row.events) as event(value)
      where event.value ->> 'type' = 'kickoff' limit 1
    ), 1);

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
    -- Fra versjon 5 er byttevinduet borte (55 sek ordinær tid) og hvert nøkkeløyeblikk tar 7 sek.
    planned_seconds := case when match_version >= 5 then 55 + shot_count * 7 else 65 + shot_count * 10 end
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
