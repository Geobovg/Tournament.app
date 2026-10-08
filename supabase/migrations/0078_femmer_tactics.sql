-- Femmer: taktikkbytter i kampen. Den som spiller kampen kan bytte taktikk underveis; byttet gjelder
-- fra og med `minute` og settes av serveren ut fra kampklokka. Åpent spill regnes ut på nytt fra frøet
-- med byttene (se src/lib/femmer/match.ts), så det er nok å lagre selve byttene her.
create table if not exists five_match_tactics (
  match_id uuid not null references five_matches(id) on delete cascade,
  minute integer not null check (minute between 1 and 40),
  side text not null check (side in ('home', 'away')),
  tactic text not null check (tactic in ('balanced', 'attack', 'defend', 'press')),
  created_at timestamptz not null default now(),
  primary key (match_id, side, minute)
);
alter table five_match_tactics enable row level security;
