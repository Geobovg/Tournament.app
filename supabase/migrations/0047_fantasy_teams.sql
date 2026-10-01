-- Fantasy, steg 2: pris på spillerne og hvert sitt fantasy-lag.
--
-- Reglene for laget (15 spillere, budsjett, maks 3 fra samme klubb, gyldig
-- startellever, kaptein) sjekkes i src/lib/fantasy/squad-rules.ts før laget lagres.
-- save_fantasy_team skriver laget i én transaksjon.

-- Pris i tideler av en million: 45 betyr 4,5 mill. Settes av `npm run fantasy:sync`
-- ut fra ratingen i spillerkatalogen (src/lib/fantasy/pricing.ts).
alter table football_season_players add column price integer not null default 45 check (price between 35 and 160);

create table fantasy_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  api_season integer not null references fantasy_seasons (api_season) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  captain_id integer not null references football_players (api_player_id),
  vice_captain_id integer not null references football_players (api_player_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, api_season),
  check (captain_id <> vice_captain_id)
);

alter table fantasy_teams enable row level security;

-- Plass 1–11 er startelleveren, 12–15 er benken i den rekkefølgen innbytterne brukes.
create table fantasy_team_players (
  team_id uuid not null references fantasy_teams (id) on delete cascade,
  api_player_id integer not null references football_players (api_player_id),
  slot smallint not null check (slot between 1 and 15),
  -- Prisen da spilleren ble kjøpt. Brukes når spillerne får nye priser senere.
  purchase_price integer not null,
  primary key (team_id, api_player_id),
  unique (team_id, slot)
);

alter table fantasy_team_players enable row level security;

-- Lagrer hele laget på nytt. picks er [{ "player": 123, "slot": 1 }, ...].
create or replace function public.save_fantasy_team(target_user uuid, target_season integer, team_name text, target_captain integer, target_vice integer, picks jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  team uuid;
  saved integer;
begin
  insert into fantasy_teams (user_id, api_season, name, captain_id, vice_captain_id)
  values (target_user, target_season, team_name, target_captain, target_vice)
  on conflict (user_id, api_season) do update
    set name = excluded.name, captain_id = excluded.captain_id, vice_captain_id = excluded.vice_captain_id, updated_at = now()
  returning id into team;

  delete from fantasy_team_players where team_id = team;
  insert into fantasy_team_players (team_id, api_player_id, slot, purchase_price)
  select team, season_player.api_player_id, (pick->>'slot')::smallint, season_player.price
  from jsonb_array_elements(picks) as pick
  join football_season_players as season_player
    on season_player.api_season = target_season and season_player.api_player_id = (pick->>'player')::integer;

  get diagnostics saved = row_count;
  if saved <> 15 then
    raise exception 'Fantasy-laget må ha 15 spillere fra denne sesongen';
  end if;
  return team;
end;
$fn$;

revoke all on function public.save_fantasy_team(uuid, integer, text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.save_fantasy_team(uuid, integer, text, integer, integer, jsonb) to service_role;
