-- Kortere omganger: hver omgang går nå på 25 sekunder i stedet for 60.
-- En kamp uten straffer/sjanser varer dermed 65 sekunder i sanntid: 50 sek spill + 5 sek pause
-- + 10 sek byttevindu på 70′, pluss 10 sekunder for hver straffe/stor sjanse, som før.
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
      and started_at <= now() - interval '65 seconds'
      and (target_match is null or id = target_match)
    order by started_at asc
    for update skip locked
  loop
    select count(*) into shot_count
    from jsonb_array_elements(match_row.events) as event(value)
    where event.value ->> 'type' = 'shot';

    planned_seconds := 65 + shot_count * 10;
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

revoke all on function public.settle_finished_manager_matches(uuid) from public, anon, authenticated;
grant execute on function public.settle_finished_manager_matches(uuid) to service_role;
