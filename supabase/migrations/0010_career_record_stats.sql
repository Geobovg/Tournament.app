-- Permanent career records. These counters remain when a tournament is later deleted.
alter table player_profiles
  add column tournament_wins integer not null default 0 check (tournament_wins >= 0),
  add column tournament_draws integer not null default 0 check (tournament_draws >= 0),
  add column tournament_losses integer not null default 0 check (tournament_losses >= 0),
  add column player_career_wins integer not null default 0 check (player_career_wins >= 0),
  add column player_career_draws integer not null default 0 check (player_career_draws >= 0),
  add column player_career_losses integer not null default 0 check (player_career_losses >= 0),
  add column manager_career_wins integer not null default 0 check (manager_career_wins >= 0),
  add column manager_career_draws integer not null default 0 check (manager_career_draws >= 0),
  add column manager_career_losses integer not null default 0 check (manager_career_losses >= 0);
