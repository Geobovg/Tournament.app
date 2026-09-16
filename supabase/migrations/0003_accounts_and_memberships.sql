-- Account-based access replaces the former team PINs.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  username_key text not null unique,
  email text not null unique,
  avatar_url text,
  code_hash text not null,
  code_fingerprint text not null unique,
  failed_attempts int not null default 0 check (failed_attempts >= 0),
  lockout_count int not null default 0 check (lockout_count >= 0),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tournaments
  add column owner_id uuid references profiles (id) on delete set null,
  add column team_size int not null default 1 check (team_size in (1, 2)),
  add column invite_token uuid not null default gen_random_uuid(),
  add column invite_code text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

create unique index tournaments_invite_token_idx on tournaments (invite_token);
create unique index tournaments_invite_code_idx on tournaments (invite_code);

-- The previous app had anonymous, PIN-protected teams. The user approved a clean
-- migration, so these old records and their cascading match/video/vote records go away.
delete from tournaments;

alter table teams alter column name drop not null;
alter table teams drop column pin_hash;

create table tournament_members (
  tournament_id uuid not null references tournaments (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  team_id uuid references teams (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create index tournament_members_user_idx on tournament_members (user_id);
create index tournament_members_team_idx on tournament_members (team_id);

alter table profiles enable row level security;
alter table tournament_members enable row level security;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
