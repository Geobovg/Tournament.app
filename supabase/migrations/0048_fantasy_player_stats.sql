-- Fantasy: statistikk per spiller og sesong, så prisene kan settes etter hvor bra
-- spilleren gjør det nå og har gjort det før (src/lib/fantasy/pricing.ts).
--
-- Tallene er sesongsummer i ligaen fra API-Football (/players). En spiller som har
-- byttet lag i løpet av sesongen har én rad per lag.

create table football_player_season_stats (
  api_season integer not null,
  api_player_id integer not null references football_players (api_player_id) on delete cascade,
  api_team_id integer not null,
  appearances integer not null default 0,
  minutes integer not null default 0,
  goals integer not null default 0,
  assists integer not null default 0,
  -- For keepere: mål sluppet inn og redninger.
  goals_conceded integer not null default 0,
  saves integer not null default 0,
  penalties_saved integer not null default 0,
  penalties_missed integer not null default 0,
  yellow_cards integer not null default 0,
  red_cards integer not null default 0,
  -- Snittkarakter fra API-Football, f.eks. 7.12. Tom når spilleren ikke har spilt.
  rating numeric(4, 2),
  updated_at timestamptz not null default now(),
  primary key (api_season, api_player_id, api_team_id),
  foreign key (api_season, api_team_id) references football_season_teams (api_season, api_team_id) on delete cascade
);

alter table football_player_season_stats enable row level security;

-- Forrige sesong for testsesongen 2024/25. Bare statistikken derfra brukes.
insert into fantasy_seasons (api_season, label, is_current) values (2023, '2023/24', false)
on conflict (api_season) do nothing;

-- Spillere man allerede eier, beholder prisen de ble kjøpt for når prisene endrer seg.
-- Bare nye spillere i laget får dagens pris.
create or replace function public.save_fantasy_team(target_user uuid, target_season integer, team_name text, target_captain integer, target_vice integer, picks jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  team uuid;
  saved integer;
  previous jsonb;
begin
  select coalesce(jsonb_object_agg(owned.api_player_id::text, owned.purchase_price), '{}'::jsonb) into previous
  from fantasy_team_players as owned
  join fantasy_teams as existing on existing.id = owned.team_id
  where existing.user_id = target_user and existing.api_season = target_season;

  insert into fantasy_teams (user_id, api_season, name, captain_id, vice_captain_id)
  values (target_user, target_season, team_name, target_captain, target_vice)
  on conflict (user_id, api_season) do update
    set name = excluded.name, captain_id = excluded.captain_id, vice_captain_id = excluded.vice_captain_id, updated_at = now()
  returning id into team;

  delete from fantasy_team_players where team_id = team;
  insert into fantasy_team_players (team_id, api_player_id, slot, purchase_price)
  select team, season_player.api_player_id, (pick->>'slot')::smallint,
    coalesce((previous->>(season_player.api_player_id::text))::integer, season_player.price)
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
