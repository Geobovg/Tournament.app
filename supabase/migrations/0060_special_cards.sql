-- Spesialkort, første type: inform (som Team of the Week i FC).
-- * Hver fredag kl. 18:00 norsk tid trekkes 25 tilfeldige spillere blant topp 400 i katalogen. De får et
--   inform-kort som er 1–3 bedre (+1 vanligst, +3 sjeldnest, maks 99). Har spilleren hatt inform før,
--   bygger det nye kortet på forrige inform, så det blir en ekte oppgradering.
-- * Spillere fra de to siste rundene trekkes ikke. Topp 20 kan bare få inform én gang totalt.
--   Tallene ligger i game_settings, så de kan endres uten ny kode.
-- * Inform-kortet er et eget kort (manager_cards.special_card_id). Man kan eie både vanlig-kortet og
--   informen, men bare én av dem kan være i troppen (samme catalog_id, se 0054).
-- * Vanlige pakker kan gi inform blant ukens kort. Inform-pakken (800 MB) garanterer én og kan kjøpes én
--   gang per uke. Spesialpakken (fra SBC) gir ett spesialkort blant alle som noen gang er laget, og kan
--   ikke selges på markedet.

-- 1) Innstillinger som kan endres uten ny kode.
create table if not exists game_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table game_settings enable row level security;

insert into game_settings (key, value) values
  ('inform_round_size', '25'),
  ('inform_pool_size', '400'),
  ('inform_protected_top', '20'),
  ('inform_protected_max', '1'),
  ('inform_cooldown_rounds', '2')
on conflict (key) do nothing;

create or replace function public.game_setting_int(target_key text, fallback integer)
returns integer language sql stable set search_path = public, pg_temp
as $fn$ select coalesce((select (value #>> '{}')::integer from game_settings where key = target_key), fallback) $fn$;

-- 2) Rundene og kortene.
create table if not exists special_rounds (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('inform')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (kind, starts_at)
);
alter table special_rounds enable row level security;

create table if not exists special_cards (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references special_rounds(id) on delete cascade,
  kind text not null check (kind in ('inform')),
  catalog_id uuid not null references player_catalog(id) on delete cascade,
  overall integer not null check (overall between 40 and 99),
  -- Hvor mye bedre kortet ble enn kortet det bygger på (vanlig-kortet eller forrige inform).
  boost integer not null check (boost between 1 and 3),
  attributes jsonb not null,
  price integer not null check (price > 0),
  created_at timestamptz not null default now(),
  unique (round_id, catalog_id)
);
create index if not exists special_cards_catalog_idx on special_cards (catalog_id, created_at desc);
alter table special_cards enable row level security;

alter table manager_cards add column if not exists special_card_id uuid references special_cards(id);
create index if not exists manager_cards_special_idx on manager_cards (special_card_id) where special_card_id is not null;

-- 3) Kortverdien for en rating. Fra 84 følger den verdikurven fra 0034 (forlenget opp til 99),
--    under 84 er det snittprisen i katalogen. Inform-kort koster 1,5 ganger verdien på den nye ratingen.
create or replace function public.card_value_for_overall(target_overall integer)
returns integer language sql stable set search_path = public, pg_temp
as $fn$
  select case
    when target_overall >= 84 then (array[100, 140, 200, 280, 400, 560, 800, 1100, 1500, 2000, 2600, 3300, 4000, 5000, 6000, 7500])[least(target_overall, 99) - 83]
    else coalesce((select round(avg(price))::integer from player_catalog where active and overall = target_overall), 50)
  end
$fn$;

-- 4) Ukens inform-runde. Lages første gang noen trenger den etter fredag kl. 18:00, så det trengs ingen cron.
create or replace function public.ensure_special_round()
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  bounds jsonb := public.sbc_week_bounds();
  week_start timestamptz := (bounds->>'week_start')::timestamptz;
  round_id uuid;
  round_size integer := public.game_setting_int('inform_round_size', 25);
  pool_size integer := public.game_setting_int('inform_pool_size', 400);
  protected_top integer := public.game_setting_int('inform_protected_top', 20);
  protected_max integer := public.game_setting_int('inform_protected_max', 1);
  cooldown integer := public.game_setting_int('inform_cooldown_rounds', 2);
begin
  select id into round_id from special_rounds where kind = 'inform' and starts_at = week_start;
  if round_id is not null then return round_id; end if;
  -- To samtidige forespørsler skal ikke lage to runder.
  perform pg_advisory_xact_lock(hashtext('special_rounds:inform'));
  select id into round_id from special_rounds where kind = 'inform' and starts_at = week_start;
  if round_id is not null then return round_id; end if;

  insert into special_rounds (kind, starts_at, ends_at) values ('inform', week_start, (bounds->>'next_reset')::timestamptz)
  returning id into round_id;

  with ranked as (
    select catalog.id, catalog.overall, catalog.attributes,
      row_number() over (order by catalog.overall desc, catalog.price desc, catalog.id) as rank
    from player_catalog catalog where catalog.active
  ),
  recent as (
    select card.catalog_id from special_cards card
    where card.round_id in (select id from special_rounds where kind = 'inform' and starts_at < week_start order by starts_at desc limit cooldown)
  ),
  latest as (
    select distinct on (card.catalog_id) card.catalog_id, card.overall, card.attributes
    from special_cards card join special_rounds round on round.id = card.round_id
    where card.kind = 'inform' order by card.catalog_id, round.starts_at desc
  ),
  earlier as (
    select catalog_id, count(*) as informs from special_cards where kind = 'inform' group by catalog_id
  ),
  eligible as (
    select ranked.id, coalesce(latest.overall, ranked.overall) as from_overall, coalesce(latest.attributes, ranked.attributes) as from_attributes
    from ranked
    left join latest on latest.catalog_id = ranked.id
    left join earlier on earlier.catalog_id = ranked.id
    where ranked.rank <= pool_size
      and ranked.id not in (select catalog_id from recent)
      and not (ranked.rank <= protected_top and coalesce(earlier.informs, 0) >= protected_max)
      and coalesce(latest.overall, ranked.overall) < 99
  ),
  picked as (
    select eligible.* from eligible order by random() limit round_size
  ),
  -- Egen trekning for boosten. Den kan ikke deles med sorteringen over, da ville de laveste trekkene alltid vunnet.
  rolled as (
    select picked.*, (select random() where picked.id is not null) as roll from picked
  ),
  boosted as (
    select rolled.*, least(99 - from_overall, case when roll < 0.6 then 1 when roll < 0.9 then 2 else 3 end) as boost from rolled
  )
  insert into special_cards (round_id, kind, catalog_id, overall, boost, attributes, price)
  select round_id, 'inform', boosted.id, boosted.from_overall + boosted.boost, boosted.boost,
    coalesce((select jsonb_object_agg(attribute.key, least(99, attribute.value::integer + boosted.boost)) from jsonb_each_text(boosted.from_attributes) as attribute), '{}'::jsonb),
    ceil(public.card_value_for_overall(boosted.from_overall + boosted.boost) * 1.5)::integer
  from boosted;

  return round_id;
end;
$fn$;

-- 5) Trekker ett spesialkort. 'current' er ukens inform-runde, 'all' er alle spesialkort som er laget.
--    Høyt ratede kort er sjeldnere: først velges et ratingsjikt etter vekt, så et tilfeldig kort i sjiktet.
create or replace function public.draw_special_card(scope text, excluded uuid[])
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  current_round uuid;
  tiers jsonb := '[{"min":40,"max":82,"weight":50},{"min":83,"max":85,"weight":30},{"min":86,"max":87,"weight":12},{"min":88,"max":89,"weight":6},{"min":90,"max":99,"weight":2}]';
  candidates uuid[];
  tier jsonb;
  total_weight numeric := 0;
  roll numeric;
  running numeric := 0;
  picked uuid;
begin
  if scope = 'current' then current_round := public.ensure_special_round(); end if;
  candidates := array(
    select id from special_cards
    where (scope = 'all' or round_id = current_round) and id <> all(coalesce(excluded, '{}'))
  );
  if cardinality(candidates) = 0 then return null; end if;

  for tier in select value from jsonb_array_elements(tiers) loop
    if exists (select 1 from special_cards where id = any(candidates) and overall between (tier->>'min')::integer and (tier->>'max')::integer) then
      total_weight := total_weight + (tier->>'weight')::numeric;
    end if;
  end loop;
  roll := random() * total_weight;
  for tier in select value from jsonb_array_elements(tiers) loop
    continue when not exists (select 1 from special_cards where id = any(candidates) and overall between (tier->>'min')::integer and (tier->>'max')::integer);
    running := running + (tier->>'weight')::numeric;
    if roll <= running then
      select id into picked from special_cards
      where id = any(candidates) and overall between (tier->>'min')::integer and (tier->>'max')::integer
      order by random() limit 1;
      return picked;
    end if;
  end loop;
  select id into picked from special_cards where id = any(candidates) order by random() limit 1;
  return picked;
end;
$fn$;

-- 6) Pakkene får inform-sjanse, garanterte spesialkort, ukesgrense og om de kan kjøpes.
alter table manager_packs add column if not exists inform_chance numeric not null default 0 check (inform_chance between 0 and 1);
alter table manager_packs add column if not exists special_guarantee integer not null default 0 check (special_guarantee >= 0);
alter table manager_packs add column if not exists special_scope text not null default 'current' check (special_scope in ('current', 'all'));
alter table manager_packs add column if not exists purchasable boolean not null default true;
alter table manager_packs add column if not exists weekly_limit integer check (weekly_limit is null or weekly_limit >= 1);
alter table manager_packs add column if not exists untradable boolean not null default false;

-- Sjansen for inform per kort. Bronse og sølv er sjeldnere enn et 83+-kort i samme pakke.
update manager_packs set inform_chance = 0.003 where key = 'bronse';
update manager_packs set inform_chance = 0.005 where key = 'solv';
update manager_packs set inform_chance = 0.03 where key = 'gull';
update manager_packs set inform_chance = 0.08 where key = 'elite';

insert into manager_packs (key, name, description, price, card_count, guarantee_min, guarantee_count, guarantees, odds, accent, sort_order,
  inform_chance, special_guarantee, special_scope, purchasable, weekly_limit, untradable) values
  ('inform', 'Inform-pakke', 'Sju kort: garantert én inform, én 88+, to 86+ og tre 83+. Én per uke.', 800, 7, 83, 6,
    '[{"min":88,"count":1},{"min":86,"count":2},{"min":83,"count":3}]',
    '[{"min":83,"max":85,"weight":75},{"min":86,"max":87,"weight":18},{"min":88,"max":89,"weight":5},{"min":90,"max":99,"weight":2}]',
    '#d4af37', 5, 0, 1, 'current', true, 1, false),
  ('spesial', 'Spesialpakke', 'Ett tilfeldig spesialkort. Kan ikke selges på markedet.', 800, 1, 40, 0, '[]',
    '[{"min":83,"max":99,"weight":1}]',
    '#8e44ff', 6, 0, 1, 'all', false, null, true)
on conflict (key) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, card_count = excluded.card_count,
  guarantee_min = excluded.guarantee_min, guarantee_count = excluded.guarantee_count, guarantees = excluded.guarantees, odds = excluded.odds,
  accent = excluded.accent, sort_order = excluded.sort_order, inform_chance = excluded.inform_chance, special_guarantee = excluded.special_guarantee,
  special_scope = excluded.special_scope, purchasable = excluded.purchasable, weekly_limit = excluded.weekly_limit, untradable = excluded.untradable, active = true;

-- 7) Hvor mye arenaen løfter inform-sjansen. Alle er i arena 1 til arenaene kommer (0062).
create or replace function public.manager_inform_factor(target_user uuid)
returns numeric language sql stable set search_path = public, pg_temp
as $fn$ select 1::numeric $fn$;

-- 8) Duplikater: vanlig-kortet og informen til samme spiller er ikke duplikater av hverandre,
--    men to like inform-kort er det.
create or replace function public.has_unresolved_duplicates(target_user uuid)
returns boolean
language sql
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from manager_cards card
    where card.owner_id = target_user and card.catalog_id is not null
      and not exists (select 1 from market_listings listing where listing.card_id = card.id and listing.status = 'active')
    group by card.catalog_id, card.special_card_id
    having count(*) > 1
  );
$fn$;

-- 9) Selve pakkeåpningen. Kjøp og gratispakker går gjennom samme funksjon; bare kjøp betaler og teller
--    mot ukesgrensen. Garantiene virker som før. Deretter kan hvert ugaranterte kort bli en inform, og til
--    slutt legges de garanterte spesialkortene til.
create or replace function public.deliver_manager_pack(target_user uuid, target_pack text, paid boolean)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  profile_row player_profiles%rowtype;
  pack_row manager_packs%rowtype;
  card_row record;
  owned_before text[];
  drawn uuid[] := '{}';
  claimed uuid[] := '{}';
  slot_catalog uuid[];
  slot_special uuid[];
  used_specials uuid[] := '{}';
  normal_count integer;
  chance numeric;
  free_squad integer;
  free_storage integer;
  slot text;
  requirement jsonb;
  requirement_min integer;
  picked uuid;
  qualifying uuid;
  weakest uuid;
  replacement uuid;
  special_row special_cards%rowtype;
  pulls jsonb := '[]'::jsonb;
  new_card_id uuid;
  week_start timestamptz := (public.sbc_week_bounds()->>'week_start')::timestamptz;
begin
  select * into profile_row from player_profiles where user_id = target_user for update;
  if not found then raise exception 'Fant ikke managerprofilen'; end if;
  select * into pack_row from manager_packs where key = target_pack and active;
  if not found then raise exception 'Pakken finnes ikke'; end if;
  if paid then
    if not pack_row.purchasable then raise exception 'Denne pakken kan ikke kjøpes'; end if;
    if profile_row.manager_budget < pack_row.price then raise exception 'Ikke nok managerbudsjett'; end if;
    if pack_row.weekly_limit is not null
      and (select count(*) from pack_openings where user_id = target_user and pack_key = target_pack and price > 0 and created_at >= week_start) >= pack_row.weekly_limit then
      raise exception 'Du har allerede kjøpt denne pakken denne uken';
    end if;
  end if;
  if public.has_unresolved_duplicates(target_user) then raise exception 'Du har duplikater som må selges eller kastes før du åpner en ny pakke'; end if;

  free_squad := public.manager_squad_capacity() - (select count(*) from manager_cards where owner_id = target_user and location = 'squad');
  free_storage := public.manager_storage_capacity() - (select count(*) from manager_cards where owner_id = target_user and location = 'storage');
  if free_squad + free_storage < pack_row.card_count then raise exception 'Du har ikke plass til % kort. Selg eller kast kort først', pack_row.card_count; end if;

  owned_before := array(select catalog_id::text || ':' || coalesce(special_card_id::text, '') from manager_cards where owner_id = target_user and catalog_id is not null);
  normal_count := greatest(0, pack_row.card_count - pack_row.special_guarantee);

  for slot_index in 1..normal_count loop
    picked := public.draw_pack_card(pack_row.odds, 0, drawn);
    if picked is null then raise exception 'Katalogen har ikke nok kort til denne pakken'; end if;
    drawn := drawn || picked;
  end loop;

  -- Garantiene sjekkes fra høyeste nivå og ned. Hvert garantert kort reserveres, så det ikke teller for flere nivåer.
  -- Mangler et kort, byttes det svakeste ureserverte kortet ut med et nytt trekk som oppfyller nivået.
  for requirement in select value from jsonb_array_elements(pack_row.guarantees) order by (value->>'min')::integer desc loop
    requirement_min := (requirement->>'min')::integer;
    for guarantee_index in 1..(requirement->>'count')::integer loop
      select id into qualifying from player_catalog
      where id = any(drawn) and id <> all(claimed) and overall >= requirement_min
      order by overall limit 1;
      if qualifying is null then
        select id into weakest from player_catalog where id = any(drawn) and id <> all(claimed) order by overall limit 1;
        exit when weakest is null;
        replacement := public.draw_pack_card(pack_row.odds, requirement_min, drawn);
        exit when replacement is null;
        drawn := array_replace(drawn, weakest, replacement);
        qualifying := replacement;
      end if;
      claimed := claimed || qualifying;
    end loop;
  end loop;

  slot_catalog := drawn;
  slot_special := array(select null::uuid from unnest(drawn));

  -- Hvert kort som ikke er garantert, kan bli en av ukens informs. Garanterte kort holdes utenfor, så
  -- sjansen for de andre løftes tilsvarende, og snittet per kort i pakka blir inform_chance. Arenaen løfter den litt.
  chance := pack_row.inform_chance * public.manager_inform_factor(target_user)
    * cardinality(drawn) / greatest(1, cardinality(drawn) - cardinality(claimed));
  if chance > 0 then
    for slot_index in 1..cardinality(drawn) loop
      continue when drawn[slot_index] = any(claimed) or random() >= chance;
      picked := public.draw_special_card('current', used_specials);
      exit when picked is null;
      used_specials := used_specials || picked;
      slot_special[slot_index] := picked;
      slot_catalog[slot_index] := (select catalog_id from special_cards where id = picked);
    end loop;
  end if;

  for slot_index in 1..pack_row.special_guarantee loop
    picked := public.draw_special_card(pack_row.special_scope, used_specials);
    if picked is null then raise exception 'Det finnes ingen spesialkort å trekke ennå'; end if;
    used_specials := used_specials || picked;
    slot_catalog := slot_catalog || (select catalog_id from special_cards where id = picked);
    slot_special := slot_special || picked;
  end loop;

  for slot_index in 1..cardinality(slot_catalog) loop
    select * into card_row from player_catalog where id = slot_catalog[slot_index];
    special_row := null;
    if slot_special[slot_index] is not null then select * into special_row from special_cards where id = slot_special[slot_index]; end if;
    -- Triggeren sender kortet til lageret hvis spilleren allerede er i troppen, så plassen leses tilbake fra raden.
    slot := case when free_squad > 0 then 'squad' else 'storage' end;
    insert into manager_cards (owner_id, catalog_id, name, position, overall, attributes, acquired_price, location, special_card_id, tradable)
    values (target_user, card_row.id, card_row.name, card_row.position,
      coalesce(special_row.overall, card_row.overall), coalesce(special_row.attributes, card_row.attributes),
      coalesce(special_row.price, card_row.price), slot, special_row.id, not pack_row.untradable)
    returning id, location into new_card_id, slot;
    if slot = 'squad' then free_squad := free_squad - 1; else free_storage := free_storage - 1; end if;
    pulls := pulls || jsonb_build_object(
      'card_id', new_card_id, 'catalog_id', card_row.id, 'slug', card_row.slug, 'name', card_row.name,
      'position', card_row.position, 'overall', coalesce(special_row.overall, card_row.overall), 'price', coalesce(special_row.price, card_row.price),
      'accent', card_row.accent, 'club', card_row.club, 'attributes', coalesce(special_row.attributes, card_row.attributes),
      'location', slot, 'special', special_row.kind, 'tradable', not pack_row.untradable,
      'duplicate', (card_row.id::text || ':' || coalesce(special_row.id::text, '')) = any(owned_before));
  end loop;

  if paid then
    update player_profiles set manager_budget = manager_budget - pack_row.price, updated_at = now() where user_id = target_user;
  end if;
  insert into pack_openings (user_id, pack_key, price, pulls) values (target_user, pack_row.key, case when paid then pack_row.price else 0 end, pulls);
  return pulls;
end;
$fn$;

create or replace function public.open_manager_pack(target_user uuid, target_pack text)
returns jsonb language sql set search_path = public, pg_temp
as $fn$ select public.deliver_manager_pack(target_user, target_pack, true) $fn$;

create or replace function public.open_free_manager_pack(target_user uuid, target_pack text)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  update manager_pack_inventory
  set quantity = quantity - 1, updated_at = now()
  where user_id = target_user and pack_key = target_pack and quantity > 0;
  if not found then raise exception 'Du har ingen gratis pakker av denne typen'; end if;
  return public.deliver_manager_pack(target_user, target_pack, false);
end;
$fn$;

-- 10) Katalogkjøp: det er bare vanlig-kortet man ikke kan ha to av. Eier man informen, kan man kjøpe vanlig-kortet.
create or replace function public.buy_catalog_card(target_user uuid, target_catalog uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  profile_row player_profiles%rowtype;
  catalog_row player_catalog%rowtype;
  slot text;
  new_card_id uuid;
begin
  select * into profile_row from player_profiles where user_id = target_user for update;
  if not found then raise exception 'Fant ikke managerprofilen'; end if;
  select * into catalog_row from player_catalog where id = target_catalog and active for share;
  if not found then raise exception 'Kortet er ikke tilgjengelig'; end if;
  if catalog_row.overall > public.catalog_buy_max_overall() then raise exception 'Spillere på % eller bedre finnes bare i pakker og på overgangsmarkedet', public.catalog_buy_max_overall() + 1; end if;
  if profile_row.manager_budget < catalog_row.price then raise exception 'Ikke nok managerbudsjett'; end if;
  if exists (select 1 from manager_cards where owner_id = target_user and catalog_id = target_catalog and special_card_id is null) then raise exception 'Du eier allerede dette kortet'; end if;
  slot := public.next_card_location(target_user);
  if slot is null then raise exception 'Både troppen og lageret er fullt'; end if;

  update player_profiles set manager_budget = manager_budget - catalog_row.price, updated_at = now() where user_id = target_user;
  insert into manager_cards (owner_id, catalog_id, name, position, overall, attributes, acquired_price, location)
  values (target_user, catalog_row.id, catalog_row.name, catalog_row.position, catalog_row.overall, catalog_row.attributes, catalog_row.price, slot)
  returning id into new_card_id;
  return new_card_id;
end;
$fn$;

-- 11) Kortverdien er spesialkortets pris når kortet er et spesialkort, ellers katalogprisen.
create or replace function public.manager_card_value(target_card uuid)
returns integer language sql stable set search_path = public, pg_temp
as $fn$
  select coalesce(special.price, catalog.price)
  from manager_cards card
  left join special_cards special on special.id = card.special_card_id
  left join player_catalog catalog on catalog.id = card.catalog_id
  where card.id = target_card
$fn$;

-- Hurtigsalg gir 25 % av verdien. Spesialkort som ikke kan selges på markedet, kan likevel hurtigselges.
create or replace function public.quick_sell_manager_card(target_user uuid, target_card uuid)
returns integer
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  card_row manager_cards%rowtype;
  payout integer;
begin
  select * into card_row from manager_cards where id = target_card for update;
  if not found or card_row.owner_id <> target_user then raise exception 'Du eier ikke dette kortet'; end if;
  if not card_row.tradable and card_row.special_card_id is null then raise exception 'Academy-kort kan ikke selges'; end if;
  if exists (select 1 from market_listings where card_id = target_card and status = 'active') then raise exception 'Kortet ligger ute på markedet'; end if;
  payout := coalesce(floor(public.manager_card_value(target_card) * 0.25)::integer, 0);
  perform public.drop_card_from_lineup(target_user, target_card);
  delete from manager_cards where id = target_card;
  update player_profiles set manager_budget = manager_budget + payout, manager_budget_earned = manager_budget_earned + payout, updated_at = now() where user_id = target_user;
  return payout;
end;
$fn$;

create or replace function public.create_market_listing(target_seller uuid, target_card uuid, next_start_price integer, next_buy_now_price integer, duration_hours integer)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  card_row manager_cards%rowtype;
  card_value integer;
  listing_id uuid;
  low_price integer;
  high_price integer;
begin
  if duration_hours not in (1, 6, 24) then raise exception 'Velg 1, 6 eller 24 timer'; end if;
  select * into card_row from manager_cards where id = target_card for update;
  if not found or card_row.owner_id <> target_seller then raise exception 'Du eier ikke dette kortet'; end if;
  if not card_row.tradable and card_row.special_card_id is not null then raise exception 'Dette kortet kan ikke selges på markedet'; end if;
  if not card_row.tradable then raise exception 'Academy-kort kan ikke selges'; end if;
  if exists (select 1 from market_listings where card_id = target_card and status = 'active') then raise exception 'Kortet ligger allerede ute'; end if;
  -- Selgerens profil låses, så to samtidige annonser ikke kan snike seg forbi taket.
  perform 1 from player_profiles where user_id = target_seller for update;
  if (select count(*) from market_listings where seller_id = target_seller and status = 'active') >= public.market_listing_limit() then
    raise exception 'Du kan ha maks % kort ute samtidig', public.market_listing_limit();
  end if;
  card_value := public.manager_card_value(target_card);
  if card_value is null then raise exception 'Kortet har ingen markedsverdi'; end if;
  low_price := greatest(1, ceil(card_value * 0.25));
  high_price := floor(card_value * 4);
  if next_start_price < low_price or next_start_price > high_price or next_buy_now_price < next_start_price or next_buy_now_price > high_price then raise exception 'Prisen må være mellom % og % managerbudsjett', low_price, high_price; end if;
  insert into market_listings (seller_id, card_id, starting_price, buy_now_price, ends_at)
  values (target_seller, target_card, next_start_price, next_buy_now_price, now() + make_interval(hours => duration_hours)) returning id into listing_id;
  return listing_id;
end;
$fn$;

revoke all on function public.game_setting_int(text, integer) from public, anon, authenticated;
revoke all on function public.card_value_for_overall(integer) from public, anon, authenticated;
revoke all on function public.ensure_special_round() from public, anon, authenticated;
revoke all on function public.draw_special_card(text, uuid[]) from public, anon, authenticated;
revoke all on function public.manager_inform_factor(uuid) from public, anon, authenticated;
revoke all on function public.deliver_manager_pack(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.open_manager_pack(uuid, text) from public, anon, authenticated;
revoke all on function public.open_free_manager_pack(uuid, text) from public, anon, authenticated;
revoke all on function public.buy_catalog_card(uuid, uuid) from public, anon, authenticated;
revoke all on function public.manager_card_value(uuid) from public, anon, authenticated;
revoke all on function public.quick_sell_manager_card(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_market_listing(uuid, uuid, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.has_unresolved_duplicates(uuid) from public, anon, authenticated;
grant execute on function public.game_setting_int(text, integer) to service_role;
grant execute on function public.card_value_for_overall(integer) to service_role;
grant execute on function public.ensure_special_round() to service_role;
grant execute on function public.draw_special_card(text, uuid[]) to service_role;
grant execute on function public.manager_inform_factor(uuid) to service_role;
grant execute on function public.deliver_manager_pack(uuid, text, boolean) to service_role;
grant execute on function public.open_manager_pack(uuid, text) to service_role;
grant execute on function public.open_free_manager_pack(uuid, text) to service_role;
grant execute on function public.buy_catalog_card(uuid, uuid) to service_role;
grant execute on function public.manager_card_value(uuid) to service_role;
grant execute on function public.quick_sell_manager_card(uuid, uuid) to service_role;
grant execute on function public.create_market_listing(uuid, uuid, integer, integer, integer) to service_role;
grant execute on function public.has_unresolved_duplicates(uuid) to service_role;
