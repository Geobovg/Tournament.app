-- Femmer: en egen modus der lagene bare består av de personlige kortene (migrering 0063).
-- * Fem på banen (keeper + fire utespillere) og opptil fem på benken. Resten av kortene er reserver.
-- * Man starter med sitt eget personlige kort (hvis man har ett) og velger resten fritt blant de andre,
--   så man har fem kort. Alle kort starter på 70 her, uansett hva kortet er i managerkarrieren.
-- * Man kan bare ha ett eksemplar av hver person. Trekker man en man allerede har i en pakke,
--   blir kortet man har 1 bedre i stedet (maks 99).
-- * Kortene får erfaring (xp) av å spille. Hver 100 xp gir +1 rating.
-- * Mynter er valutaen i modusen og har ingenting med managerbudsjettet (MB) å gjøre.
-- Alt skrives fra serveren med service_role; tabellene er stengt for alle andre.

create table if not exists five_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  coins integer not null default 500 check (coins >= 0),
  -- Trinnet på AI-stigen. Seier mot trinnet man står på flytter en opp.
  ai_level integer not null default 1 check (ai_level between 1 and 30),
  best_ai_level integer not null default 1,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  formation text not null default '1-2-1',
  last_free_pack_on date,
  created_at timestamptz not null default now()
);
alter table five_profiles enable row level security;

create table if not exists five_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  -- Personen på kortet, altså eieren av det personlige kortet i personal_cards.
  person_id uuid not null references personal_cards(user_id) on delete cascade,
  overall integer not null default 70 check (overall between 40 and 99),
  xp integer not null default 0 check (xp >= 0),
  goals integer not null default 0,
  assists integer not null default 0,
  appearances integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, person_id)
);
create index if not exists five_cards_owner_idx on five_cards (owner_id);
alter table five_cards enable row level security;

-- starters[1] står i mål. Kortene må tilhøre brukeren; det sjekkes i save_five_lineup.
create table if not exists five_lineups (
  user_id uuid primary key references profiles(id) on delete cascade,
  starters uuid[] not null check (cardinality(starters) = 5),
  bench uuid[] not null default '{}' check (cardinality(bench) <= 5),
  updated_at timestamptz not null default now()
);
alter table five_lineups enable row level security;

create table if not exists five_matches (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ai', 'friend')),
  home_user_id uuid not null references profiles(id) on delete cascade,
  away_user_id uuid references profiles(id) on delete cascade,
  away_name text not null,
  ai_level integer,
  home_score integer not null,
  away_score integer not null,
  -- Hele kampen ferdig simulert: lagene ved avspark og hendelsene minutt for minutt.
  events jsonb not null,
  coins integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists five_matches_home_idx on five_matches (home_user_id, created_at desc);
create index if not exists five_matches_away_idx on five_matches (away_user_id, created_at desc);
alter table five_matches enable row level security;

-- 1) Oppstart: eget kort (hvis man har ett) og de man valgte. Kortene blir startfemmeren.
create or replace function public.start_five_career(target_user uuid, picked uuid[])
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  own boolean := exists (select 1 from personal_cards where user_id = target_user);
  team uuid[];
begin
  if exists (select 1 from five_profiles where user_id = target_user) then raise exception 'Du har allerede startet Femmer'; end if;
  if picked is null or cardinality(picked) <> (case when own then 4 else 5 end) then raise exception 'Velg riktig antall kort'; end if;
  if (select count(distinct person) from unnest(picked) person) <> cardinality(picked) then raise exception 'Du kan ikke velge samme kort to ganger'; end if;
  if target_user = any(picked) then raise exception 'Ditt eget kort er allerede med'; end if;
  if (select count(*) from personal_cards where user_id = any(picked)) <> cardinality(picked) then raise exception 'Fant ikke alle kortene'; end if;

  insert into five_profiles (user_id) values (target_user);
  insert into five_cards (owner_id, person_id)
  select target_user, person from unnest(case when own then array[target_user] || picked else picked end) person;
  -- Eget kort står først, altså i mål, men det kan byttes etterpå.
  select array_agg(card.id order by card.person_id <> target_user, array_position(picked, card.person_id)) into team
  from five_cards card where card.owner_id = target_user;
  insert into five_lineups (user_id, starters, bench) values (target_user, team, '{}');
end;
$fn$;

-- 2) Laguttak. Alle kortene må være brukerens egne, og ingen kan stå to steder.
create or replace function public.save_five_lineup(target_user uuid, next_formation text, next_starters uuid[], next_bench uuid[])
returns void language plpgsql set search_path = public, pg_temp
as $fn$
declare
  everyone uuid[] := next_starters || coalesce(next_bench, '{}');
begin
  if next_formation not in ('1-2-1', '2-2', '3-1', '1-1-2') then raise exception 'Ugyldig formasjon'; end if;
  if cardinality(next_starters) <> 5 then raise exception 'Startfemmeren må ha fem kort'; end if;
  if cardinality(coalesce(next_bench, '{}')) > 5 then raise exception 'Benken har plass til fem kort'; end if;
  if (select count(distinct id) from unnest(everyone) id) <> cardinality(everyone) then raise exception 'Samme kort kan ikke stå to steder'; end if;
  if (select count(*) from five_cards where owner_id = target_user and id = any(everyone)) <> cardinality(everyone) then raise exception 'Du eier ikke alle kortene'; end if;
  update five_profiles set formation = next_formation where user_id = target_user;
  insert into five_lineups (user_id, starters, bench, updated_at) values (target_user, next_starters, coalesce(next_bench, '{}'), now())
  on conflict (user_id) do update set starters = excluded.starters, bench = excluded.bench, updated_at = now();
end;
$fn$;

-- 3) Pakker. Prisen og antallet bestemmes av serveren (src/lib/femmer/packs.ts). Pris 0 er
--    dagens gratispakke, som bare kan åpnes én gang per dag (norsk tid).
--    Kortene trekkes blant alle personlige kort. Har man personen fra før, blir kortet 1 bedre.
--    Nye kort settes på benken hvis det er plass.
create or replace function public.open_five_pack(target_user uuid, card_count integer, pack_price integer)
returns jsonb language plpgsql set search_path = public, pg_temp
as $fn$
declare
  today date := (now() at time zone 'Europe/Oslo')::date;
  person uuid;
  existing five_cards%rowtype;
  new_card uuid;
  pulls jsonb := '[]'::jsonb;
  current_bench uuid[];
begin
  if card_count < 1 or card_count > 5 or pack_price < 0 then raise exception 'Ugyldig pakke'; end if;
  perform 1 from five_profiles where user_id = target_user for update;
  if not found then raise exception 'Du har ikke startet Femmer'; end if;
  if pack_price = 0 then
    update five_profiles set last_free_pack_on = today where user_id = target_user and last_free_pack_on is distinct from today;
    if not found then raise exception 'Du har allerede åpnet dagens gratispakke'; end if;
  else
    update five_profiles set coins = coins - pack_price where user_id = target_user and coins >= pack_price;
    if not found then raise exception 'Du har ikke nok mynter'; end if;
  end if;

  for i in 1..card_count loop
    select user_id into person from personal_cards order by random() limit 1;
    if person is null then raise exception 'Det finnes ingen personlige kort ennå'; end if;
    select * into existing from five_cards where owner_id = target_user and person_id = person;
    if found then
      update five_cards set overall = least(99, overall + 1) where id = existing.id;
      pulls := pulls || jsonb_build_object('card_id', existing.id, 'person_id', person, 'overall', least(99, existing.overall + 1), 'upgrade', true);
    else
      insert into five_cards (owner_id, person_id) values (target_user, person) returning id into new_card;
      select bench into current_bench from five_lineups where user_id = target_user for update;
      if cardinality(current_bench) < 5 then
        update five_lineups set bench = bench || new_card, updated_at = now() where user_id = target_user;
      end if;
      pulls := pulls || jsonb_build_object('card_id', new_card, 'person_id', person, 'overall', 70, 'upgrade', false);
    end if;
  end loop;
  return pulls;
end;
$fn$;

-- 4) Lagrer en ferdig simulert kamp og deler ut mynter, erfaring og tabellstatistikk.
--    Kampen simuleres på serveren (src/lib/femmer/match.ts); her skrives alt i én transaksjon.
--    card_stats: [{ "id": kort-id, "xp": n, "goals": n, "assists": n }] for hjemmelagets kort.
create or replace function public.record_five_match(
  target_user uuid, match_kind text, opponent uuid, opponent_name text, level integer,
  score_home integer, score_away integer, match_events jsonb, reward integer, card_stats jsonb
) returns uuid language plpgsql set search_path = public, pg_temp
as $fn$
declare
  match_id uuid;
  result text := case when score_home > score_away then 'win' when score_home = score_away then 'draw' else 'loss' end;
  stat jsonb;
begin
  perform 1 from five_profiles where user_id = target_user for update;
  if not found then raise exception 'Du har ikke startet Femmer'; end if;
  insert into five_matches (kind, home_user_id, away_user_id, away_name, ai_level, home_score, away_score, events, coins)
  values (match_kind, target_user, opponent, opponent_name, level, score_home, score_away, match_events, reward)
  returning id into match_id;

  update five_profiles set
    coins = coins + reward,
    wins = wins + (result = 'win')::int,
    draws = draws + (result = 'draw')::int,
    losses = losses + (result = 'loss')::int,
    -- Seier mot trinnet man står på flytter en opp på AI-stigen.
    ai_level = case when match_kind = 'ai' and result = 'win' and level = ai_level then least(30, ai_level + 1) else ai_level end,
    best_ai_level = greatest(best_ai_level, case when match_kind = 'ai' and result = 'win' and level = ai_level then least(30, ai_level + 1) else ai_level end)
  where user_id = target_user;

  -- Vennen man spilte mot får kampen i statistikken sin, men ingen mynter.
  if opponent is not null then
    update five_profiles set
      wins = wins + (result = 'loss')::int,
      draws = draws + (result = 'draw')::int,
      losses = losses + (result = 'win')::int
    where user_id = opponent;
  end if;

  for stat in select * from jsonb_array_elements(coalesce(card_stats, '[]'::jsonb)) loop
    update five_cards set
      appearances = appearances + 1,
      goals = goals + coalesce((stat->>'goals')::int, 0),
      assists = assists + coalesce((stat->>'assists')::int, 0),
      -- Hver hele 100 xp blir til +1 rating, og resten blir liggende til neste gang.
      overall = least(99, overall + (xp + coalesce((stat->>'xp')::int, 0)) / 100),
      xp = case when overall + (xp + coalesce((stat->>'xp')::int, 0)) / 100 >= 99 then 0 else (xp + coalesce((stat->>'xp')::int, 0)) % 100 end
    where id = (stat->>'id')::uuid and owner_id = target_user;
  end loop;
  return match_id;
end;
$fn$;

revoke all on function public.start_five_career(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.save_five_lineup(uuid, text, uuid[], uuid[]) from public, anon, authenticated;
revoke all on function public.open_five_pack(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.record_five_match(uuid, text, uuid, text, integer, integer, integer, jsonb, integer, jsonb) from public, anon, authenticated;
grant execute on function public.start_five_career(uuid, uuid[]) to service_role;
grant execute on function public.save_five_lineup(uuid, text, uuid[], uuid[]) to service_role;
grant execute on function public.open_five_pack(uuid, integer, integer) to service_role;
grant execute on function public.record_five_match(uuid, text, uuid, text, integer, integer, integer, jsonb, integer, jsonb) to service_role;
