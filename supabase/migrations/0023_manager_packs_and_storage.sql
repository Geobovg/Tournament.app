-- Kortlager og pakkeåpning for managerkarrieren.
-- Troppen rommer nå 23 kort (ellever, benk og noen reserver). Alt over det bor i
-- klubblageret, som tar 80 kort. Pakker trekkes server-side slik at oddsen ikke
-- kan påvirkes fra nettleseren.

alter table manager_cards add column if not exists location text not null default 'squad';
alter table manager_cards drop constraint if exists manager_cards_location_check;
alter table manager_cards add constraint manager_cards_location_check check (location in ('squad', 'storage'));
create index if not exists manager_cards_owner_location_idx on manager_cards (owner_id, location);

-- Kapasitetene bor i én funksjon hver, slik at alle overganger teller likt.
create or replace function public.manager_squad_capacity() returns integer language sql immutable set search_path = public, pg_temp as $fn$ select 23 $fn$;
create or replace function public.manager_storage_capacity() returns integer language sql immutable set search_path = public, pg_temp as $fn$ select 80 $fn$;

-- Hvor et innkommende kort havner: i troppen hvis det er plass, ellers på lageret.
-- Null betyr at spilleren er helt full og ikke kan ta imot flere kort.
create or replace function public.next_card_location(target_user uuid)
returns text
language sql
set search_path = public, pg_temp
as $fn$
  select case
    when (select count(*) from manager_cards where owner_id = target_user and location = 'squad') < public.manager_squad_capacity() then 'squad'
    when (select count(*) from manager_cards where owner_id = target_user and location = 'storage') < public.manager_storage_capacity() then 'storage'
  end;
$fn$;

-- Et kort som forlater troppen må også ut av den lagrede elleveren.
create or replace function public.drop_card_from_lineup(target_user uuid, target_card uuid)
returns void
language sql
set search_path = public, pg_temp
as $fn$
  update manager_lineups
  set starters = array_remove(starters, target_card), bench = array_remove(bench, target_card), updated_at = now()
  where user_id = target_user and (target_card = any(starters) or target_card = any(bench));
$fn$;

-- Et duplikat regnes som uavklart så lenge begge kortene ligger i klubben uten å
-- være lagt ut for salg. Da er pakkeåpning stengt til spilleren har valgt side.
create or replace function public.has_unresolved_duplicates(target_user uuid)
returns boolean
language sql
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from manager_cards card
    where card.owner_id = target_user and card.catalog_id is not null
      and not exists (select 1 from market_listings listing where listing.card_id = card.id and listing.status = 'active')
    group by card.catalog_id
    having count(*) > 1
  );
$fn$;

create table if not exists manager_packs (
  key text primary key,
  name text not null,
  description text not null,
  price integer not null check (price > 0),
  card_count integer not null check (card_count between 1 and 12),
  guarantee_min integer not null check (guarantee_min between 40 and 99),
  guarantee_count integer not null check (guarantee_count >= 1),
  odds jsonb not null,
  accent text not null,
  sort_order integer not null,
  active boolean not null default true
);
alter table manager_packs enable row level security;

create table if not exists pack_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pack_key text not null references manager_packs(key),
  price integer not null,
  pulls jsonb not null,
  created_at timestamptz not null default now()
);
alter table pack_openings enable row level security;
create index if not exists pack_openings_user_idx on pack_openings (user_id, created_at desc);

-- Oddsen er vekter per ratingsjikt, ikke prosent: funksjonen normaliserer selv.
-- Garantien kontrolleres etter trekningen og bytter ut de svakeste kortene.
insert into manager_packs (key, name, description, price, card_count, guarantee_min, guarantee_count, odds, accent, sort_order) values
  ('bronse', 'Bronsepakke', 'Ett kort, garantert 78 eller bedre.', 20, 1, 78, 1,
    '[{"min":78,"max":81,"weight":78},{"min":82,"max":84,"weight":18},{"min":85,"max":87,"weight":3.5},{"min":88,"max":99,"weight":0.5}]', '#c08457', 1),
  ('solv', 'Sølvpakke', 'To kort, garantert minst ett på 80 eller bedre.', 40, 2, 80, 1,
    '[{"min":70,"max":77,"weight":10},{"min":78,"max":81,"weight":58},{"min":82,"max":84,"weight":25},{"min":85,"max":87,"weight":6},{"min":88,"max":99,"weight":1}]', '#b7c2cc', 2),
  ('gull', 'Gullpakke', 'Tre kort, garantert minst ett på 82 eller bedre.', 80, 3, 82, 1,
    '[{"min":70,"max":77,"weight":5},{"min":78,"max":81,"weight":42},{"min":82,"max":84,"weight":38},{"min":85,"max":87,"weight":13},{"min":88,"max":99,"weight":2}]', '#f2c94c', 3),
  ('elite', 'Elitepakke', 'Seks kort, garantert minst to på 84 eller bedre.', 150, 6, 84, 2,
    '[{"min":78,"max":81,"weight":24},{"min":82,"max":84,"weight":44},{"min":85,"max":87,"weight":26},{"min":88,"max":99,"weight":6}]', '#7a5cff', 4)
on conflict (key) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, card_count = excluded.card_count,
  guarantee_min = excluded.guarantee_min, guarantee_count = excluded.guarantee_count, odds = excluded.odds,
  accent = excluded.accent, sort_order = excluded.sort_order, active = true;

create or replace function public.open_manager_pack(target_user uuid, target_pack text)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  profile_row player_profiles%rowtype;
  pack_row manager_packs%rowtype;
  card_row record;
  owned_before uuid[];
  drawn uuid[] := '{}';
  free_squad integer;
  free_storage integer;
  slot text;
  tier jsonb;
  total_weight numeric;
  roll numeric;
  running numeric;
  picked uuid;
  weakest uuid;
  replacement uuid;
  guaranteed integer;
  pulls jsonb := '[]'::jsonb;
  new_card_id uuid;
begin
  select * into profile_row from player_profiles where user_id = target_user for update;
  if not found then raise exception 'Fant ikke managerprofilen'; end if;
  select * into pack_row from manager_packs where key = target_pack and active;
  if not found then raise exception 'Pakken finnes ikke'; end if;
  if profile_row.manager_budget < pack_row.price then raise exception 'Ikke nok managerbudsjett'; end if;
  if public.has_unresolved_duplicates(target_user) then raise exception 'Du har duplikater som må selges eller kastes før du åpner en ny pakke'; end if;

  free_squad := public.manager_squad_capacity() - (select count(*) from manager_cards where owner_id = target_user and location = 'squad');
  free_storage := public.manager_storage_capacity() - (select count(*) from manager_cards where owner_id = target_user and location = 'storage');
  if free_squad + free_storage < pack_row.card_count then raise exception 'Du har ikke plass til % kort. Selg eller kast kort først', pack_row.card_count; end if;

  owned_before := array(select catalog_id from manager_cards where owner_id = target_user and catalog_id is not null);
  total_weight := (select sum((value->>'weight')::numeric) from jsonb_array_elements(pack_row.odds));

  for slot_index in 1..pack_row.card_count loop
    roll := random() * total_weight;
    running := 0;
    picked := null;
    for tier in select value from jsonb_array_elements(pack_row.odds) loop
      running := running + (tier->>'weight')::numeric;
      if roll <= running then
        select id into picked from player_catalog
        where active and overall between (tier->>'min')::integer and (tier->>'max')::integer and id <> all(drawn)
        order by random() limit 1;
        exit;
      end if;
    end loop;
    -- Tomt ratingsjikt eller utmattet katalog: fall tilbake til et hvilket som helst kort.
    if picked is null then
      select id into picked from player_catalog where active and id <> all(drawn) order by random() limit 1;
    end if;
    if picked is null then raise exception 'Katalogen har ikke nok kort til denne pakken'; end if;
    drawn := drawn || picked;
  end loop;

  guaranteed := (select count(*) from player_catalog where id = any(drawn) and overall >= pack_row.guarantee_min);
  while guaranteed < pack_row.guarantee_count loop
    select id into weakest from player_catalog where id = any(drawn) and overall < pack_row.guarantee_min order by overall limit 1;
    exit when weakest is null;
    select id into replacement from player_catalog where active and overall >= pack_row.guarantee_min and id <> all(drawn) order by random() limit 1;
    exit when replacement is null;
    drawn := array_replace(drawn, weakest, replacement);
    guaranteed := guaranteed + 1;
  end loop;

  for card_row in
    select catalog.* from player_catalog catalog
    join unnest(drawn) with ordinality as pulled(id, ord) on pulled.id = catalog.id
    order by pulled.ord
  loop
    if free_squad > 0 then slot := 'squad'; free_squad := free_squad - 1; else slot := 'storage'; free_storage := free_storage - 1; end if;
    insert into manager_cards (owner_id, catalog_id, name, position, overall, attributes, acquired_price, location)
    values (target_user, card_row.id, card_row.name, card_row.position, card_row.overall, card_row.attributes, card_row.price, slot)
    returning id into new_card_id;
    pulls := pulls || jsonb_build_object(
      'card_id', new_card_id, 'catalog_id', card_row.id, 'slug', card_row.slug, 'name', card_row.name,
      'position', card_row.position, 'overall', card_row.overall, 'price', card_row.price,
      'accent', card_row.accent, 'club', card_row.club, 'attributes', card_row.attributes,
      'location', slot, 'duplicate', card_row.id = any(owned_before));
  end loop;

  update player_profiles set manager_budget = manager_budget - pack_row.price, updated_at = now() where user_id = target_user;
  insert into pack_openings (user_id, pack_key, price, pulls) values (target_user, pack_row.key, pack_row.price, pulls);
  return pulls;
end;
$fn$;

create or replace function public.move_manager_card(target_user uuid, target_card uuid, next_location text)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  card_row manager_cards%rowtype;
begin
  if next_location not in ('squad', 'storage') then raise exception 'Ugyldig plassering'; end if;
  select * into card_row from manager_cards where id = target_card for update;
  if not found or card_row.owner_id <> target_user then raise exception 'Du eier ikke dette kortet'; end if;
  if card_row.location = next_location then return; end if;
  if next_location = 'squad' and (select count(*) from manager_cards where owner_id = target_user and location = 'squad') >= public.manager_squad_capacity() then
    raise exception 'Troppen er full (maks % kort). Bytt ut en spiller i stedet', public.manager_squad_capacity();
  end if;
  if next_location = 'storage' and (select count(*) from manager_cards where owner_id = target_user and location = 'storage') >= public.manager_storage_capacity() then
    raise exception 'Lageret er fullt (maks % kort)', public.manager_storage_capacity();
  end if;
  if next_location = 'storage' then perform public.drop_card_from_lineup(target_user, target_card); end if;
  update manager_cards set location = next_location where id = target_card;
end;
$fn$;

create or replace function public.swap_manager_cards(target_user uuid, squad_card uuid, storage_card uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  outgoing manager_cards%rowtype;
  incoming manager_cards%rowtype;
begin
  if squad_card = storage_card then raise exception 'Velg to forskjellige kort'; end if;
  -- Lås begge radene i id-rekkefølge, slik at to samtidige bytter ikke låser hverandre.
  perform 1 from manager_cards where id in (squad_card, storage_card) order by id for update;
  select * into outgoing from manager_cards where id = squad_card;
  if not found or outgoing.owner_id <> target_user or outgoing.location <> 'squad' then raise exception 'Velg et kort fra troppen'; end if;
  select * into incoming from manager_cards where id = storage_card;
  if not found or incoming.owner_id <> target_user or incoming.location <> 'storage' then raise exception 'Velg et kort fra lageret'; end if;
  perform public.drop_card_from_lineup(target_user, squad_card);
  update manager_cards set location = 'storage' where id = squad_card;
  update manager_cards set location = 'squad' where id = storage_card;
end;
$fn$;

-- Quick sell gir ingen managerpoeng. Den finnes for å bli kvitt duplikater
-- raskt. Vil du ha betalt, legger du kortet ut på overgangsmarkedet i stedet.
create or replace function public.quick_sell_manager_card(target_user uuid, target_card uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  card_row manager_cards%rowtype;
begin
  select * into card_row from manager_cards where id = target_card for update;
  if not found or card_row.owner_id <> target_user then raise exception 'Du eier ikke dette kortet'; end if;
  if not card_row.tradable then raise exception 'Academy-kort kan ikke kastes'; end if;
  if exists (select 1 from market_listings where card_id = target_card and status = 'active') then raise exception 'Kortet ligger ute på markedet'; end if;
  if exists (select 1 from direct_transfer_offers where card_id = target_card and status = 'pending') then raise exception 'Kortet har et aktivt overgangstilbud'; end if;
  perform public.drop_card_from_lineup(target_user, target_card);
  delete from manager_cards where id = target_card;
end;
$fn$;

-- Alle overganger må nå plassere kortet i tropp eller lager, og telle mot riktig tak.
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
  if profile_row.manager_budget < catalog_row.price then raise exception 'Ikke nok managerbudsjett'; end if;
  if exists (select 1 from manager_cards where owner_id = target_user and catalog_id = target_catalog) then raise exception 'Du eier allerede dette kortet'; end if;
  slot := public.next_card_location(target_user);
  if slot is null then raise exception 'Både troppen og lageret er fullt'; end if;

  update player_profiles set manager_budget = manager_budget - catalog_row.price, updated_at = now() where user_id = target_user;
  insert into manager_cards (owner_id, catalog_id, name, position, overall, attributes, acquired_price, location)
  values (target_user, catalog_row.id, catalog_row.name, catalog_row.position, catalog_row.overall, catalog_row.attributes, catalog_row.price, slot)
  returning id into new_card_id;
  return new_card_id;
end;
$fn$;

create or replace function public.buy_now_market_listing(target_buyer uuid, target_listing uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  listing_row market_listings%rowtype;
  card_row manager_cards%rowtype;
  buyer_profile player_profiles%rowtype;
  seller_profile player_profiles%rowtype;
  slot text;
begin
  select * into listing_row from market_listings where id = target_listing for update;
  if not found or listing_row.status <> 'active' or listing_row.ends_at <= now() then raise exception 'Annonsen er ikke aktiv'; end if;
  if listing_row.seller_id = target_buyer then raise exception 'Du kan ikke kjøpe eget kort'; end if;
  if not exists (select 1 from friend_requests where status = 'accepted' and ((requester_id = target_buyer and recipient_id = listing_row.seller_id) or (recipient_id = target_buyer and requester_id = listing_row.seller_id))) then raise exception 'Bare selgerens venner kan kjøpe'; end if;
  select * into buyer_profile from player_profiles where user_id = target_buyer for update;
  select * into seller_profile from player_profiles where user_id = listing_row.seller_id for update;
  if buyer_profile.manager_budget < listing_row.buy_now_price then raise exception 'Ikke nok managerbudsjett'; end if;
  slot := public.next_card_location(target_buyer);
  if slot is null then raise exception 'Troppen og lageret ditt er fullt'; end if;
  select * into card_row from manager_cards where id = listing_row.card_id for update;
  if card_row.owner_id <> listing_row.seller_id then raise exception 'Kortet har allerede fått ny eier'; end if;
  perform public.drop_card_from_lineup(listing_row.seller_id, listing_row.card_id);
  update player_profiles set manager_budget = manager_budget - listing_row.buy_now_price, updated_at = now() where user_id = target_buyer;
  update player_profiles set manager_budget = manager_budget + floor(listing_row.buy_now_price * 0.95), manager_budget_earned = manager_budget_earned + floor(listing_row.buy_now_price * 0.95), updated_at = now() where user_id = listing_row.seller_id;
  update manager_cards set owner_id = target_buyer, acquired_price = listing_row.buy_now_price, location = slot where id = listing_row.card_id;
  update market_listings set status = 'sold', buyer_id = target_buyer, sold_price = buy_now_price where id = target_listing;
  return listing_row.card_id;
end;
$fn$;

create or replace function public.settle_expired_market_listings()
returns integer
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  listing_row market_listings%rowtype;
  winning_bid record;
  card_row manager_cards%rowtype;
  slot text;
  settled integer := 0;
begin
  for listing_row in select * from market_listings where status = 'active' and ends_at <= now() for update skip locked loop
    select bids.bidder_id, bids.amount into winning_bid
    from market_bids bids
    join player_profiles buyer on buyer.user_id = bids.bidder_id
    where bids.listing_id = listing_row.id
      and buyer.manager_budget >= bids.amount
      and public.next_card_location(bids.bidder_id) is not null
    order by bids.amount desc, bids.created_at asc limit 1;

    if not found then
      update market_listings set status = 'expired' where id = listing_row.id;
      continue;
    end if;

    select * into card_row from manager_cards where id = listing_row.card_id for update;
    if not found or card_row.owner_id <> listing_row.seller_id then
      update market_listings set status = 'cancelled' where id = listing_row.id;
      continue;
    end if;
    perform 1 from player_profiles where user_id = winning_bid.bidder_id for update;
    perform 1 from player_profiles where user_id = listing_row.seller_id for update;
    slot := public.next_card_location(winning_bid.bidder_id);
    if slot is null then
      update market_listings set status = 'expired' where id = listing_row.id;
      continue;
    end if;
    perform public.drop_card_from_lineup(listing_row.seller_id, listing_row.card_id);
    update player_profiles set manager_budget = manager_budget - winning_bid.amount, updated_at = now() where user_id = winning_bid.bidder_id;
    update player_profiles set manager_budget = manager_budget + floor(winning_bid.amount * 0.95), manager_budget_earned = manager_budget_earned + floor(winning_bid.amount * 0.95), updated_at = now() where user_id = listing_row.seller_id;
    update manager_cards set owner_id = winning_bid.bidder_id, acquired_price = winning_bid.amount, location = slot where id = listing_row.card_id;
    update market_listings set status = 'sold', buyer_id = winning_bid.bidder_id, sold_price = winning_bid.amount where id = listing_row.id;
    settled := settled + 1;
  end loop;
  return settled;
end;
$fn$;

create or replace function public.respond_direct_transfer_offer(target_actor uuid, target_offer uuid, response text)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  offer_row direct_transfer_offers%rowtype;
  card_row manager_cards%rowtype;
  buyer_profile player_profiles%rowtype;
  seller_profile player_profiles%rowtype;
  slot text;
begin
  if response not in ('accept', 'decline') then raise exception 'Ugyldig svar'; end if;
  select * into offer_row from direct_transfer_offers where id = target_offer for update;
  if not found or offer_row.status <> 'pending' then raise exception 'Tilbudet er ikke lenger aktivt'; end if;
  if offer_row.expires_at <= now() then update direct_transfer_offers set status = 'expired', responded_at = now() where id = offer_row.id; raise exception 'Tilbudet har utløpt'; end if;
  if target_actor = offer_row.proposed_by then raise exception 'Vent på at vennen din svarer'; end if;
  if target_actor <> offer_row.seller_id and target_actor <> offer_row.buyer_id then raise exception 'Du kan ikke svare på dette tilbudet'; end if;
  if response = 'decline' then update direct_transfer_offers set status = 'declined', responded_at = now() where id = offer_row.id; return offer_row.card_id; end if;
  if not exists (select 1 from friend_requests where status = 'accepted' and ((requester_id = offer_row.seller_id and recipient_id = offer_row.buyer_id) or (recipient_id = offer_row.seller_id and requester_id = offer_row.buyer_id))) then raise exception 'Dere er ikke lenger venner'; end if;
  select * into card_row from manager_cards where id = offer_row.card_id for update;
  if not found or card_row.owner_id <> offer_row.seller_id then raise exception 'Kortet er ikke lenger tilgjengelig'; end if;
  select * into buyer_profile from player_profiles where user_id = offer_row.buyer_id for update;
  select * into seller_profile from player_profiles where user_id = offer_row.seller_id for update;
  if buyer_profile.manager_budget < offer_row.price then raise exception 'Kjøperen har ikke nok managerbudsjett'; end if;
  slot := public.next_card_location(offer_row.buyer_id);
  if slot is null then raise exception 'Kjøperens tropp og lager er fullt'; end if;
  perform public.drop_card_from_lineup(offer_row.seller_id, offer_row.card_id);
  update player_profiles set manager_budget = manager_budget - offer_row.price, updated_at = now() where user_id = offer_row.buyer_id;
  update player_profiles set manager_budget = manager_budget + floor(offer_row.price * .95), manager_budget_earned = manager_budget_earned + floor(offer_row.price * .95), updated_at = now() where user_id = offer_row.seller_id;
  update manager_cards set owner_id = offer_row.buyer_id, acquired_price = offer_row.price, location = slot where id = offer_row.card_id;
  update direct_transfer_offers set status = 'accepted', responded_at = now() where id = offer_row.id;
  update direct_transfer_offers set status = 'cancelled', responded_at = now() where card_id = offer_row.card_id and status = 'pending' and id <> offer_row.id;
  update market_listings set status = 'cancelled' where card_id = offer_row.card_id and status = 'active';
  return offer_row.card_id;
end;
$fn$;
