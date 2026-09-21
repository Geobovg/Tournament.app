-- Use one atomic update per settled result so simultaneous matches cannot lose a record entry.
create or replace function increment_career_record(target_user uuid, record_column text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if record_column not in (
    'tournament_wins', 'tournament_draws', 'tournament_losses',
    'player_career_wins', 'player_career_draws', 'player_career_losses',
    'manager_career_wins', 'manager_career_draws', 'manager_career_losses'
  ) then
    raise exception 'Unknown career record column';
  end if;

  execute format('update player_profiles set %1$I = %1$I + 1, updated_at = now() where user_id = $1', record_column)
    using target_user;
end;
$$;
