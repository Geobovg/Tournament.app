-- Remove the retired player-career mode while preserving manager and tournament data.
delete from public.career_matches where mode = 'player';
delete from public.career_challenges where mode = 'player';
delete from public.career_reward_events where reward_key in ('player_win', 'player_loss', 'player_draw');

alter table public.career_challenges
  drop constraint if exists career_challenges_mode_check,
  add constraint career_challenges_mode_check check (mode = 'manager');

alter table public.career_matches
  drop constraint if exists career_matches_mode_check,
  add constraint career_matches_mode_check check (mode = 'manager');

create or replace function public.increment_career_record(target_user uuid, record_column text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if record_column not in (
    'tournament_wins', 'tournament_draws', 'tournament_losses',
    'manager_career_wins', 'manager_career_draws', 'manager_career_losses'
  ) then
    raise exception 'Unknown career record column';
  end if;

  execute format('update player_profiles set %1$I = %1$I + 1, updated_at = now() where user_id = $1', record_column)
    using target_user;
end;
$$;

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
    manager_budget
  )
  values (
    target_user,
    'career_match',
    target_match,
    target_reward_key,
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

alter table public.career_reward_events
  drop column if exists player_points;

alter table public.player_profiles
  drop column if exists player_name,
  drop column if exists primary_position,
  drop column if exists player_points,
  drop column if exists player_points_earned,
  drop column if exists club_style,
  drop column if exists appearance,
  drop column if exists stats,
  drop column if exists player_career_wins,
  drop column if exists player_career_draws,
  drop column if exists player_career_losses;
