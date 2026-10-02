-- Fantasy: prisen hver spiller hadde i hver runde, så spillervinduet kan vise den ved
-- tidligere kamper (som i Premier League Fantasy). Prisen lagres ved fristen, når runden
-- låses (src/lib/fantasy/tick.ts). Runder som ble låst før denne tabellen fantes, har ingen pris.

create table fantasy_player_round_prices (
  api_season integer not null,
  round_number integer not null,
  api_player_id integer not null,
  -- I tideler, som football_season_players.price.
  price integer not null,
  primary key (api_season, round_number, api_player_id),
  foreign key (api_season, round_number) references fantasy_rounds (api_season, number) on delete cascade
);

alter table fantasy_player_round_prices enable row level security;

-- Tar vare på dagens pris for alle spillerne i sesongen, for runden som nettopp ble låst.
create or replace function public.snapshot_fantasy_round_prices(target_season integer, target_round integer)
returns void
language sql
set search_path = public, pg_temp
as $fn$
  insert into fantasy_player_round_prices (api_season, round_number, api_player_id, price)
  select api_season, target_round, api_player_id, price
  from football_season_players
  where api_season = target_season
  on conflict (api_season, round_number, api_player_id) do update set price = excluded.price;
$fn$;

revoke all on function public.snapshot_fantasy_round_prices(integer, integer) from public, anon, authenticated;
grant execute on function public.snapshot_fantasy_round_prices(integer, integer) to service_role;
