-- Fantasy, steg 3–5: runder og frister, poeng per kamp, låste lag per runde, bytter med
-- bank og salgspris, chips og fantasy-ligaer med venner.
--
-- Poengene regnes ut i src/lib/fantasy/points.ts og lagres her av den automatiske jobben
-- (src/lib/fantasy/tick.ts, kalt fra /api/fantasy/tick). Reglene for bytter og chips er
-- de samme som i src/lib/fantasy/squad-rules.ts. TS og SQL må stemme.

-- Bare for testing: når satt, later Fantasy som om klokka er dette tidspunktet for sesongen.
alter table fantasy_seasons add column simulated_now timestamptz;
-- Når terminlista og stallene sist ble hentet av den automatiske jobben.
alter table fantasy_seasons add column fixtures_synced_at timestamptz;

-- En runde går fra tirsdag 00:00 til og med mandag (norsk tid), så mandagskampene avslutter
-- helgerunden. Fristen er 90 minutter før rundens første kamp.
create table fantasy_rounds (
  api_season integer not null references fantasy_seasons (api_season) on delete cascade,
  number integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  deadline_at timestamptz not null,
  locked_at timestamptz,
  finished_at timestamptz,
  primary key (api_season, number)
);

alter table fantasy_rounds enable row level security;

alter table football_fixtures add column round_number integer;
alter table football_fixtures add column details_synced_at timestamptz;
create index football_fixtures_round_idx on football_fixtures (api_season, round_number);

-- Tallene og poengene til hver spiller i hver kamp.
create table football_fixture_players (
  api_fixture_id integer not null references football_fixtures (api_fixture_id) on delete cascade,
  api_player_id integer not null,
  api_team_id integer not null,
  minutes integer not null default 0,
  goals integer not null default 0,
  assists integer not null default 0,
  saves integer not null default 0,
  penalties_saved integer not null default 0,
  penalties_missed integer not null default 0,
  yellow_cards integer not null default 0,
  red_cards integer not null default 0,
  own_goals integer not null default 0,
  goals_conceded integer not null default 0,
  rating numeric(4, 2),
  bonus integer not null default 0,
  points integer not null default 0,
  breakdown jsonb not null default '{}'::jsonb,
  primary key (api_fixture_id, api_player_id)
);

create index football_fixture_players_player_idx on football_fixture_players (api_player_id);

alter table football_fixture_players enable row level security;

-- Siste prisendring (i tideler), så appen kan vise om prisen har gått opp eller ned.
alter table football_season_players add column price_change integer not null default 0;

-- Bank: penger igjen etter kjøp og salg. free_transfers: gratisbytter til neste runde.
-- pending_chip: chipen som brukes i neste runde. free_hit_backup: laget slik det var før
-- en Free Hit-runde, som settes tilbake når runden er ferdig.
alter table fantasy_teams add column bank integer not null default 1000;
alter table fantasy_teams add column free_transfers integer not null default 1;
alter table fantasy_teams add column pending_chip text check (pending_chip in ('wildcard', 'free_hit', 'bench_boost', 'triple_captain'));
alter table fantasy_teams add column first_round integer;
alter table fantasy_teams add column free_hit_backup jsonb;

update fantasy_teams set bank = 1000 - coalesce((select sum(purchase_price) from fantasy_team_players where team_id = fantasy_teams.id), 0);

-- Laget slik det var da en runde ble låst, og poengene det fikk.
create table fantasy_team_rounds (
  team_id uuid not null references fantasy_teams (id) on delete cascade,
  round_number integer not null,
  captain_id integer not null,
  vice_captain_id integer not null,
  chip text check (chip in ('wildcard', 'free_hit', 'bench_boost', 'triple_captain')),
  transfers integer not null default 0,
  transfer_cost integer not null default 0,
  bank integer not null,
  -- Netto poeng i runden, etter minuspoeng for bytter.
  points integer not null default 0,
  bench_points integer not null default 0,
  -- Kapteinen som faktisk fikk dobbel (visekapteinen hvis kapteinen ikke spilte).
  effective_captain_id integer,
  primary key (team_id, round_number)
);

create index fantasy_team_rounds_round_idx on fantasy_team_rounds (round_number);

alter table fantasy_team_rounds enable row level security;

create table fantasy_team_round_players (
  team_id uuid not null,
  round_number integer not null,
  api_player_id integer not null,
  slot smallint not null check (slot between 1 and 15),
  purchase_price integer not null,
  points integer not null default 0,
  -- 0 = telte ikke (benk), 1 = vanlig, 2 = kaptein, 3 = Triple Captain.
  multiplier smallint not null default 0,
  subbed_in boolean not null default false,
  subbed_out boolean not null default false,
  primary key (team_id, round_number, api_player_id),
  foreign key (team_id, round_number) references fantasy_team_rounds (team_id, round_number) on delete cascade
);

alter table fantasy_team_round_players enable row level security;

-- Fantasy-ligaer med venner. Alle lag er også med i den felles ligaen, som ikke trenger rader.
create table fantasy_leagues (
  id uuid primary key default gen_random_uuid(),
  api_season integer not null references fantasy_seasons (api_season) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  owner_id uuid not null references profiles (id) on delete cascade,
  invite_code text not null unique default public.generate_invite_code(),
  -- Tabellen teller poeng fra og med denne runden.
  start_round integer not null default 1,
  created_at timestamptz not null default now()
);

alter table fantasy_leagues enable row level security;

create table fantasy_league_members (
  league_id uuid not null references fantasy_leagues (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index fantasy_league_members_user_idx on fantasy_league_members (user_id);

alter table fantasy_league_members enable row level security;

-- Salgspris som i Premier League Fantasy: har prisen gått opp, får du halve økningen
-- (rundet ned til nærmeste 0,1). Har den gått ned, får du dagens pris.
create or replace function public.fantasy_selling_price(purchase integer, current_price integer)
returns integer
language sql immutable set search_path = public, pg_temp
as $$
  select case when current_price <= purchase then current_price else purchase + (current_price - purchase) / 2 end
$$;

-- Lagrer hele laget. Penger: banken + salgsverdien av spillerne man har. Spillere man
-- beholder koster salgsverdien sin, nye koster dagens pris. Det som er igjen, blir banken.
create or replace function public.save_fantasy_team(target_user uuid, target_season integer, team_name text, target_captain integer, target_vice integer, picks jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  existing fantasy_teams%rowtype;
  available integer := 1000;
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

-- Velger (eller fjerner, med null) chipen for neste runde. Hver chip kan brukes én gang i
-- hver halvdel av sesongen. Wildcard og Free Hit krever at laget har vært med i en runde.
create or replace function public.set_fantasy_chip(target_user uuid, target_season integer, target_chip text)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  team fantasy_teams%rowtype;
  next_round integer;
  halfway integer;
begin
  select * into team from fantasy_teams where user_id = target_user and api_season = target_season for update;
  if not found then
    raise exception 'Du har ikke noe fantasy-lag ennå';
  end if;
  if target_chip is not null then
    if target_chip not in ('wildcard', 'free_hit', 'bench_boost', 'triple_captain') then
      raise exception 'Ukjent chip';
    end if;
    if team.free_hit_backup is not null then
      raise exception 'Laget kan ikke endres før Free Hit-runden er ferdig';
    end if;
    if target_chip in ('wildcard', 'free_hit') and team.first_round is null then
      raise exception 'Wildcard og Free Hit kan brukes fra andre runde laget er med';
    end if;
    select min(number) into next_round from fantasy_rounds where api_season = target_season and locked_at is null;
    select ceil(max(number) / 2.0) into halfway from fantasy_rounds where api_season = target_season;
    if exists (
      select 1 from fantasy_team_rounds
      where team_id = team.id and chip = target_chip and (round_number <= halfway) = (coalesce(next_round, 0) <= halfway)
    ) then
      raise exception 'Denne chipen er allerede brukt i denne halvdelen av sesongen';
    end if;
  end if;
  update fantasy_teams set pending_chip = target_chip, updated_at = now() where id = team.id;
end;
$fn$;

-- Lager rundene ut fra terminlista. Låste runder endres aldri; rundene etter dem lages på
-- nytt, så utsatte kamper og nye kampdatoer havner i riktig runde.
create or replace function public.sync_fantasy_rounds(target_season integer)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  last_locked integer;
  last_locked_end timestamptz;
begin
  select max(number), max(ends_at) into last_locked, last_locked_end
  from fantasy_rounds where api_season = target_season and locked_at is not null;

  delete from fantasy_rounds where api_season = target_season and locked_at is null;

  insert into fantasy_rounds (api_season, number, starts_at, ends_at, deadline_at)
  select target_season, coalesce(last_locked, 0) + row_number() over (order by week_local),
    week_local at time zone 'Europe/Oslo',
    (week_local + interval '7 days') at time zone 'Europe/Oslo',
    first_kickoff - interval '90 minutes'
  from (
    -- Tirsdag 00:00 norsk tid i uka kampen spilles.
    select date_trunc('week', (kickoff_at at time zone 'Europe/Oslo') - interval '1 day') + interval '1 day' as week_local,
      min(kickoff_at) as first_kickoff
    from football_fixtures
    where api_season = target_season and status not in ('PST', 'CANC', 'ABD', 'AWD', 'WO')
    group by 1
  ) as weeks
  where last_locked_end is null or week_local at time zone 'Europe/Oslo' >= last_locked_end;

  update football_fixtures as fixture set round_number = fantasy_round.number
  from fantasy_rounds as fantasy_round
  where fixture.api_season = target_season and fantasy_round.api_season = target_season
    and fixture.kickoff_at >= fantasy_round.starts_at and fixture.kickoff_at < fantasy_round.ends_at
    and fixture.round_number is distinct from fantasy_round.number;
end;
$fn$;

-- Låser laget til alle ved fristen: tar en kopi av laget, teller bytter siden forrige runde
-- og trekker 4 poeng per bytte utover gratisbyttene. Gir ett nytt gratisbytte (maks 5).
-- include_teams = false låser runden uten lag. Brukes for runder som var spilt før Fantasy
-- ble slått på, så nye lag ikke får poeng for gamle kamper.
create or replace function public.lock_fantasy_round(target_season integer, target_round integer, include_teams boolean)
returns integer
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  team fantasy_teams%rowtype;
  previous_round integer;
  transfer_count integer;
  cost integer;
  next_free integer;
  backup jsonb;
  locked integer := 0;
begin
  update fantasy_rounds set locked_at = now()
  where api_season = target_season and number = target_round and locked_at is null;
  if not found or not include_teams then
    return 0;
  end if;

  for team in
    select * from fantasy_teams
    where api_season = target_season and exists (select 1 from fantasy_team_players where team_id = fantasy_teams.id)
    for update
  loop
    select max(round_number) into previous_round from fantasy_team_rounds where team_id = team.id and round_number < target_round;
    if previous_round is null then
      transfer_count := 0;
    else
      select count(*) into transfer_count
      from fantasy_team_players as current_pick
      where current_pick.team_id = team.id
        and not exists (
          select 1 from fantasy_team_round_players as old_pick
          where old_pick.team_id = team.id and old_pick.round_number = previous_round and old_pick.api_player_id = current_pick.api_player_id
        );
    end if;

    -- Første runde, Wildcard og Free Hit: alle bytter er gratis.
    cost := case when previous_round is null or team.pending_chip in ('wildcard', 'free_hit') then 0 else greatest(0, transfer_count - team.free_transfers) * 4 end;
    next_free := case
      when previous_round is null then 1
      when team.pending_chip in ('wildcard', 'free_hit') then least(5, team.free_transfers + 1)
      else least(5, greatest(0, team.free_transfers - transfer_count) + 1)
    end;

    -- Free Hit: laget fra forrige runde settes tilbake når denne runden er ferdig.
    backup := null;
    if team.pending_chip = 'free_hit' and previous_round is not null then
      select jsonb_build_object(
        'round', target_round,
        'bank', previous.bank,
        'captain', previous.captain_id,
        'vice', previous.vice_captain_id,
        'picks', (select jsonb_agg(jsonb_build_object('player', api_player_id, 'slot', slot, 'purchase', purchase_price))
                  from fantasy_team_round_players where team_id = team.id and round_number = previous_round)
      ) into backup
      from fantasy_team_rounds as previous where previous.team_id = team.id and previous.round_number = previous_round;
    end if;

    insert into fantasy_team_rounds (team_id, round_number, captain_id, vice_captain_id, chip, transfers, transfer_cost, bank, points)
    values (team.id, target_round, team.captain_id, team.vice_captain_id, team.pending_chip, transfer_count, cost, team.bank, -cost);

    insert into fantasy_team_round_players (team_id, round_number, api_player_id, slot, purchase_price, multiplier)
    select team.id, target_round, api_player_id, slot, purchase_price, case when slot <= 11 then 1 else 0 end
    from fantasy_team_players where team_id = team.id;

    update fantasy_teams
    set free_transfers = next_free, pending_chip = null, first_round = coalesce(first_round, target_round), free_hit_backup = backup
    where id = team.id;
    locked := locked + 1;
  end loop;
  return locked;
end;
$fn$;

-- Markerer runden som ferdig og setter Free Hit-lagene tilbake slik de var før runden.
create or replace function public.finish_fantasy_round(target_season integer, target_round integer)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  team fantasy_teams%rowtype;
begin
  update fantasy_rounds set finished_at = now()
  where api_season = target_season and number = target_round and finished_at is null;
  if not found then
    return;
  end if;

  for team in
    select * from fantasy_teams
    where api_season = target_season and free_hit_backup is not null and (free_hit_backup->>'round')::integer <= target_round
    for update
  loop
    delete from fantasy_team_players where team_id = team.id;
    insert into fantasy_team_players (team_id, api_player_id, slot, purchase_price)
    select team.id, (item->>'player')::integer, (item->>'slot')::smallint, (item->>'purchase')::integer
    from jsonb_array_elements(team.free_hit_backup->'picks') as item;
    update fantasy_teams
    set bank = (team.free_hit_backup->>'bank')::integer,
      captain_id = (team.free_hit_backup->>'captain')::integer,
      vice_captain_id = (team.free_hit_backup->>'vice')::integer,
      free_hit_backup = null,
      updated_at = now()
    where id = team.id;
  end loop;
end;
$fn$;

revoke all on function public.fantasy_selling_price(integer, integer) from public, anon, authenticated;
revoke all on function public.save_fantasy_team(uuid, integer, text, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.set_fantasy_chip(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.sync_fantasy_rounds(integer) from public, anon, authenticated;
revoke all on function public.lock_fantasy_round(integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.finish_fantasy_round(integer, integer) from public, anon, authenticated;
grant execute on function public.fantasy_selling_price(integer, integer) to service_role;
grant execute on function public.save_fantasy_team(uuid, integer, text, integer, integer, jsonb) to service_role;
grant execute on function public.set_fantasy_chip(uuid, integer, text) to service_role;
grant execute on function public.sync_fantasy_rounds(integer) to service_role;
grant execute on function public.lock_fantasy_round(integer, integer, boolean) to service_role;
grant execute on function public.finish_fantasy_round(integer, integer) to service_role;
