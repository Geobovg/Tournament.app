-- Fantasy: startbudsjettet økes fra 100,0 til 120,0 mill. Nye lag starter med 120,0 mill.,
-- og lag som allerede finnes, får 20,0 mill. ekstra i banken.

alter table fantasy_teams alter column bank set default 1200;

update fantasy_teams set bank = bank + 200;

-- Lagrer hele laget. Penger: banken + salgsverdien av spillerne man har. Spillere man
-- beholder koster salgsverdien sin, nye koster dagens pris. Det som er igjen, blir banken.
create or replace function public.save_fantasy_team(target_user uuid, target_season integer, team_name text, target_captain integer, target_vice integer, picks jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  existing fantasy_teams%rowtype;
  available integer := 1200;
  cost integer;
  saved integer;
  chosen jsonb;
  team uuid;
begin
  select * into existing from fantasy_teams where user_id = target_user and api_season = target_season for update;
  if found then
    if existing.free_hit_backup is not null then
      raise exception 'Laget kan ikke endres før Free Hit-runden er ferdig';
    end if;
    select existing.bank + coalesce(sum(public.fantasy_selling_price(owned.purchase_price, season_player.price)), 0) into available
    from fantasy_team_players as owned
    join football_season_players as season_player on season_player.api_season = target_season and season_player.api_player_id = owned.api_player_id
    where owned.team_id = existing.id;
  end if;

  select count(*),
    coalesce(sum(case when owned.purchase_price is null then season_player.price else public.fantasy_selling_price(owned.purchase_price, season_player.price) end), 0),
    coalesce(jsonb_agg(jsonb_build_object('player', season_player.api_player_id, 'slot', (pick->>'slot')::integer, 'purchase', coalesce(owned.purchase_price, season_player.price))), '[]'::jsonb)
  into saved, cost, chosen
  from jsonb_array_elements(picks) as pick
  join football_season_players as season_player
    on season_player.api_season = target_season and season_player.api_player_id = (pick->>'player')::integer
  left join fantasy_team_players as owned on owned.team_id = existing.id and owned.api_player_id = season_player.api_player_id;

  if saved <> 15 then
    raise exception 'Fantasy-laget må ha 15 spillere fra denne sesongen';
  end if;
  if cost > available then
    raise exception 'Laget er for dyrt';
  end if;

  insert into fantasy_teams (user_id, api_season, name, captain_id, vice_captain_id, bank)
  values (target_user, target_season, team_name, target_captain, target_vice, available - cost)
  on conflict (user_id, api_season) do update
    set name = excluded.name, captain_id = excluded.captain_id, vice_captain_id = excluded.vice_captain_id, bank = excluded.bank, updated_at = now()
  returning id into team;

  delete from fantasy_team_players where team_id = team;
  insert into fantasy_team_players (team_id, api_player_id, slot, purchase_price)
  select team, (item->>'player')::integer, (item->>'slot')::smallint, (item->>'purchase')::integer
  from jsonb_array_elements(chosen) as item;
  return team;
end;
$fn$;
