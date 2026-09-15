create type tournament_type as enum ('fifa', 'nhl');
create type tournament_status as enum ('registration', 'league', 'knockout', 'completed');
create type match_stage as enum ('league', 'knockout');
create type match_status as enum ('scheduled', 'pending_confirmation', 'confirmed');
create type match_result_type as enum ('regulation', 'ot_so', 'et_pens');

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type tournament_type not null,
  status tournament_status not null default 'registration',
  max_teams int not null check (max_teams between 2 and 128),
  legs_per_knockout_round int not null default 1 check (legs_per_knockout_round in (1, 2)),
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  name text not null,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  unique (tournament_id, name)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  stage match_stage not null,
  round_number int not null,
  tie_id uuid,
  tie_position int not null default 0,
  leg_number int not null default 1,
  home_team_id uuid references teams (id) on delete cascade,
  away_team_id uuid references teams (id) on delete cascade,
  is_bye boolean not null default false,
  home_score int,
  away_score int,
  result_type match_result_type,
  penalty_home_score int,
  penalty_away_score int,
  winner_team_id uuid references teams (id) on delete set null,
  submitted_by_team_id uuid references teams (id) on delete set null,
  status match_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index matches_tournament_round_idx on matches (tournament_id, stage, round_number);
create index matches_tie_idx on matches (tie_id);
create index teams_tournament_idx on teams (tournament_id);

create table goal_clips (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  team_id uuid not null references teams (id) on delete cascade,
  video_url text not null,
  created_at timestamptz not null default now(),
  unique (match_id, team_id)
);

create index goal_clips_match_idx on goal_clips (match_id);

create table votes (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  stage match_stage not null,
  round_number int not null,
  goal_clip_id uuid not null references goal_clips (id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique (tournament_id, stage, round_number, voter_id)
);

create index votes_clip_idx on votes (goal_clip_id);

-- All database access goes through server-side code using the service role key,
-- which bypasses RLS. No policies are defined, so no other key can read or write.
alter table tournaments enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;
alter table goal_clips enable row level security;
alter table votes enable row level security;
