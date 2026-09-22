-- Manager matches persist their planned timeline at kickoff. This function is safe
-- to call from both the app and cron: row locks plus the reward ledger make it idempotent.
create index if not exists career_matches_live_manager_started_idx
  on career_matches (started_at)
  where mode = 'manager' and status = 'live';

create or replace function public.award_manager_match_result(
  target_user uuid,
  target_match uuid,
  target_reward_key text,
  target_manager_budget integer,
  target_record_column text
)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  reward_id uuid;
begin
  insert into career_reward_events (
    user_id,
    source_type,
    source_id,
    reward_key,
    player_points,
    manager_budget
  )
  values (
    target_user,
    'career_match',
    target_match,
    target_reward_key,
    0,
    target_manager_budget
  )
  on conflict (user_id, source_type, source_id, reward_key) do nothing
  returning id into reward_id;

  if reward_id is null then
    return false;
  end if;

  update player_profiles
  set
    manager_budget = manager_budget + target_manager_budget,
    manager_budget_earned = manager_budget_earned + target_manager_budget,
    updated_at = now()
  where user_id = target_user;

  perform increment_career_record(target_user, target_record_column);
  return true;
end;
$$;

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
      and started_at <= now() - interval '150 seconds'
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

revoke all on function public.award_manager_match_result(uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.settle_finished_manager_matches(uuid) from public, anon, authenticated;
grant execute on function public.settle_finished_manager_matches(uuid) to service_role;

select cron.schedule(
  'settle-manager-matches-every-5-seconds',
  '5 seconds',
  'select public.settle_finished_manager_matches()'
);
