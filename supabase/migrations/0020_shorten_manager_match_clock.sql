-- Pausen i managerkamper er kortet fra 30 til 15 sekunder, så en kamp varer nå
-- 60 + 15 + 60 = 135 sekunder. Oppgjøret må vente like lenge som kampen faktisk varer,
-- ellers ville cron kunne avslutte kampen mens andre omgang fortsatt spilles.
-- Resten av funksjonen er uendret fra 0015.
create or replace function public.settle_finished_manager_matches(target_match uuid default null)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  match_row career_matches%rowtype;
  home_goals integer;
  away_goals integer;
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
    select
      count(*) filter (where goal.event ->> 'side' = 'home'),
      count(*) filter (where goal.event ->> 'side' = 'away')
    into home_goals, away_goals
    from jsonb_array_elements(match_row.events) as goal(event)
    where goal.event ->> 'type' = 'goal';

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

    if match_winner is null then
      perform award_manager_match_result(match_row.home_user_id, match_row.id, 'manager_draw', 2, 'manager_career_draws');
      perform award_manager_match_result(match_row.away_user_id, match_row.id, 'manager_draw', 2, 'manager_career_draws');
    else
      perform award_manager_match_result(match_winner, match_row.id, 'manager_win', 5, 'manager_career_wins');
      perform award_manager_match_result(
        case when match_winner = match_row.home_user_id then match_row.away_user_id else match_row.home_user_id end,
        match_row.id,
        'manager_loss',
        0,
        'manager_career_losses'
      );
    end if;

    settled_count := settled_count + 1;
  end loop;

  return settled_count;
end;
$$;

revoke all on function public.settle_finished_manager_matches(uuid) from public, anon, authenticated;
grant execute on function public.settle_finished_manager_matches(uuid) to service_role;
