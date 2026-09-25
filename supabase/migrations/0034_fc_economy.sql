-- FC-økonomi: stjernene blir sjeldne og dyre, markedet åpnes for alle og alle starter på nytt.
-- * Katalogen selger bare kort opp til 83. Fra 84 og opp får man kort fra pakker eller overgangsmarkedet.
-- * Katalogprisen er kortets verdi: hurtigsalg gir 25 %, og markedspriser må ligge mellom 25 % og 400 %.
-- * Overgangsmarkedet er åpent for alle brukere. Direkte overgangstilbud mellom venner er fjernet.
-- * Pakkene får flere kort, og 86+ er en sjelden gevinst i stedet for en garanti.
-- * Alle kort, lag, annonser og gratispakker nullstilles. Alle starter med 120 MB og Academy-troppen.

-- Verdikurven stiger bratt fra 84, der kortene slutter å være kjøpbare fra katalogen.
update player_catalog set price = case overall
  when 84 then 100 when 85 then 140 when 86 then 200 when 87 then 280 when 88 then 400
  when 89 then 560 when 90 then 800 when 91 then 1100 when 92 then 1500 else 2000 end
where overall >= 84;

create or replace function public.catalog_buy_max_overall() returns integer language sql immutable set search_path = public, pg_temp as $fn$ select 83 $fn$;
create or replace function public.market_listing_limit() returns integer language sql immutable set search_path = public, pg_temp as $fn$ select 10 $fn$;

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

-- Hurtigsalg gir 25 % av katalogverdien. Academy-kort har ingen verdi og kan ikke selges.
drop function if exists public.quick_sell_manager_card(uuid, uuid);
create function public.quick_sell_manager_card(target_user uuid, target_card uuid)
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
  if not card_row.tradable then raise exception 'Academy-kort kan ikke selges'; end if;
  if exists (select 1 from market_listings where card_id = target_card and status = 'active') then raise exception 'Kortet ligger ute på markedet'; end if;
  select floor(price * 0.25) into payout from player_catalog where id = card_row.catalog_id;
  payout := coalesce(payout, 0);
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
  if not card_row.tradable then raise exception 'Academy-kort kan ikke selges'; end if;
  if exists (select 1 from market_listings where card_id = target_card and status = 'active') then raise exception 'Kortet ligger allerede ute'; end if;
  -- Selgerens profil låses, så to samtidige annonser ikke kan snike seg forbi taket.
  perform 1 from player_profiles where user_id = target_seller for update;
  if (select count(*) from market_listings where seller_id = target_seller and status = 'active') >= public.market_listing_limit() then
    raise exception 'Du kan ha maks % kort ute samtidig', public.market_listing_limit();
  end if;
  select price into card_value from player_catalog where id = card_row.catalog_id;
  if card_value is null then raise exception 'Kortet har ingen markedsverdi'; end if;
  low_price := greatest(1, ceil(card_value * 0.25));
  high_price := floor(card_value * 4);
  if next_start_price < low_price or next_start_price > high_price or next_buy_now_price < next_start_price or next_buy_now_price > high_price then raise exception 'Prisen må være mellom % og % managerbudsjett', low_price, high_price; end if;
  insert into market_listings (seller_id, card_id, starting_price, buy_now_price, ends_at)
  values (target_seller, target_card, next_start_price, next_buy_now_price, now() + make_interval(hours => duration_hours)) returning id into listing_id;
  return listing_id;
end;
$fn$;

-- Alle brukere kan by. Annonseraden låses, så bud og kjøp på samme kort skjer ett om gangen.
create or replace function public.place_market_bid(target_bidder uuid, target_listing uuid, next_amount integer)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  listing_row market_listings%rowtype;
  latest_bid integer;
  budget integer;
begin
  select * into listing_row from market_listings where id = target_listing for update;
  if not found or listing_row.status <> 'active' or listing_row.ends_at <= now() then raise exception 'Annonsen er ikke aktiv'; end if;
  if listing_row.seller_id = target_bidder then raise exception 'Du kan ikke by på eget kort'; end if;
  select manager_budget into budget from player_profiles where user_id = target_bidder;
  if coalesce(budget, 0) < next_amount then raise exception 'Ikke nok managerbudsjett'; end if;
  select max(amount) into latest_bid from market_bids where listing_id = target_listing;
  if next_amount < greatest(listing_row.starting_price, coalesce(latest_bid, 0) + 1) or next_amount >= listing_row.buy_now_price then raise exception 'Budet må være høyere enn gjeldende bud og lavere enn kjøp nå-prisen'; end if;
  insert into market_bids (listing_id, bidder_id, amount) values (target_listing, target_bidder, next_amount);
end;
$fn$;

-- Alle brukere kan kjøpe. Den første som låser annonsen får kortet; neste kjøper ser at den er solgt.
create or replace function public.buy_now_market_listing(target_buyer uuid, target_listing uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  listing_row market_listings%rowtype;
  card_row manager_cards%rowtype;
  buyer_profile player_profiles%rowtype;
  slot text;
begin
  select * into listing_row from market_listings where id = target_listing for update;
  if not found or listing_row.status <> 'active' or listing_row.ends_at <= now() then raise exception 'Kortet er allerede solgt eller annonsen er utløpt'; end if;
  if listing_row.seller_id = target_buyer then raise exception 'Du kan ikke kjøpe eget kort'; end if;
  -- Profilene låses i id-rekkefølge, slik at to handler mellom de samme brukerne ikke låser hverandre.
  perform 1 from player_profiles where user_id in (target_buyer, listing_row.seller_id) order by user_id for update;
  select * into buyer_profile from player_profiles where user_id = target_buyer;
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

-- Direkte overgangstilbud er fjernet. Alt salg mellom brukere går via overgangsmarkedet.
do $$ begin
  if exists (select 1 from cron.job where jobname = 'expire-direct-transfer-offers-every-minute') then
    perform cron.unschedule('expire-direct-transfer-offers-every-minute');
  end if;
end $$;
drop function if exists public.expire_direct_transfer_offers();
drop function if exists public.create_direct_transfer_offer(uuid, uuid, uuid, integer);
drop function if exists public.respond_direct_transfer_offer(uuid, uuid, text);
drop function if exists public.counter_direct_transfer_offer(uuid, uuid, integer);
drop table if exists direct_transfer_offers;

-- Trekker ett kort etter pakkens odds. Med et minstekrav trekkes det bare blant sjiktene som når kravet,
-- med samme innbyrdes vekter. Garantikort blir dermed ikke en snarvei til stjernene.
create or replace function public.draw_pack_card(pack_odds jsonb, min_overall integer, excluded uuid[])
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  tier jsonb;
  total_weight numeric;
  roll numeric;
  running numeric := 0;
  tier_min integer;
  tier_max integer;
  picked uuid;
begin
  select sum((value->>'weight')::numeric) into total_weight from jsonb_array_elements(pack_odds) where (value->>'max')::integer >= min_overall;
  if coalesce(total_weight, 0) > 0 then
    roll := random() * total_weight;
    for tier in select value from jsonb_array_elements(pack_odds) where (value->>'max')::integer >= min_overall loop
      running := running + (tier->>'weight')::numeric;
      if roll <= running then
        tier_min := greatest((tier->>'min')::integer, min_overall);
        tier_max := (tier->>'max')::integer;
        select id into picked from player_catalog
        where active and overall between tier_min and tier_max and id <> all(excluded)
        order by random() limit 1;
        -- Tomt sjikt: ta det beste kortet under sjiktet som fortsatt når kravet, aldri et bedre kort.
        if picked is null then
          select id into picked from player_catalog
          where active and overall between min_overall and tier_max and id <> all(excluded)
          order by overall desc, random() limit 1;
        end if;
        exit;
      end if;
    end loop;
  end if;
  if picked is null then
    select id into picked from player_catalog where active and overall >= min_overall and id <> all(excluded) order by overall, random() limit 1;
  end if;
  return picked;
end;
$fn$;

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
  claimed uuid[] := '{}';
  free_squad integer;
  free_storage integer;
  slot text;
  requirement jsonb;
  requirement_min integer;
  picked uuid;
  qualifying uuid;
  weakest uuid;
  replacement uuid;
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

  for slot_index in 1..pack_row.card_count loop
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

-- Oddsen er vekter per kort (summen er 100). De er simulert så sjansen for minst én 86+ per pakke blir
-- omtrent 1 % (bronse), 3 % (sølv), 8 % (gull) og 20 % (elite), og for 88+ 0,2 %, 0,5 %, 2 % og 5 %.
alter table manager_packs drop constraint if exists manager_packs_guarantee_count_check;
alter table manager_packs add constraint manager_packs_guarantee_count_check check (guarantee_count >= 0);

update manager_packs set price = 20, card_count = 3, guarantee_min = 70, guarantee_count = 0,
  guarantees = '[]',
  odds = '[{"min":70,"max":74,"weight":50},{"min":75,"max":79,"weight":42},{"min":80,"max":82,"weight":6.3},{"min":83,"max":85,"weight":1.37},{"min":86,"max":87,"weight":0.26},{"min":88,"max":89,"weight":0.05},{"min":90,"max":99,"weight":0.02}]',
  description = 'Tre kort. Mest vanlige spillere, men alt kan skje.'
where key = 'bronse';

update manager_packs set price = 50, card_count = 5, guarantee_min = 80, guarantee_count = 1,
  guarantees = '[{"min":80,"count":1}]',
  odds = '[{"min":70,"max":74,"weight":37},{"min":75,"max":79,"weight":50.385},{"min":80,"max":82,"weight":10.7},{"min":83,"max":85,"weight":1.6},{"min":86,"max":87,"weight":0.26},{"min":88,"max":89,"weight":0.04},{"min":90,"max":99,"weight":0.015}]',
  description = 'Fem kort, garantert minst ett på 80 eller bedre.'
where key = 'solv';

update manager_packs set price = 120, card_count = 8, guarantee_min = 83, guarantee_count = 1,
  guarantees = '[{"min":83,"count":1}]',
  odds = '[{"min":70,"max":74,"weight":30},{"min":75,"max":79,"weight":51.453},{"min":80,"max":82,"weight":15.5},{"min":83,"max":85,"weight":2.8},{"min":86,"max":87,"weight":0.18},{"min":88,"max":89,"weight":0.055},{"min":90,"max":99,"weight":0.012}]',
  description = 'Åtte kort, garantert minst ett på 83 eller bedre.'
where key = 'gull';

update manager_packs set price = 300, card_count = 12, guarantee_min = 84, guarantee_count = 2,
  guarantees = '[{"min":84,"count":2}]',
  odds = '[{"min":70,"max":74,"weight":22},{"min":75,"max":79,"weight":51},{"min":80,"max":82,"weight":22},{"min":83,"max":85,"weight":4.5},{"min":86,"max":87,"weight":0.38},{"min":88,"max":89,"weight":0.09},{"min":90,"max":99,"weight":0.03}]',
  description = 'Tolv kort, garantert minst to på 84 eller bedre.'
where key = 'elite';

-- Nye managere starter med 120 MB.
alter table player_profiles alter column manager_budget set default 120;
alter table player_profiles alter column manager_budget_earned set default 120;

-- Nullstilling: alle kort, lag, annonser og sparte gratispakker slettes. Klubbnivå, XP,
-- kamphistorikk, turneringer og venner beholdes. Alle får 120 MB og Academy-troppen tilbake.
delete from market_bids;
delete from market_listings;
delete from manager_lineups;
delete from manager_cards;
delete from manager_pack_inventory;
update player_profiles set manager_budget = 120, manager_budget_earned = 120, updated_at = now();
do $$ declare profile_id uuid; begin for profile_id in select user_id from player_profiles loop perform seed_manager_starter_squad(profile_id); end loop; end $$;

revoke all on function public.catalog_buy_max_overall() from public, anon, authenticated;
revoke all on function public.market_listing_limit() from public, anon, authenticated;
revoke all on function public.buy_catalog_card(uuid, uuid) from public, anon, authenticated;
revoke all on function public.quick_sell_manager_card(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_market_listing(uuid, uuid, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.place_market_bid(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.buy_now_market_listing(uuid, uuid) from public, anon, authenticated;
revoke all on function public.draw_pack_card(jsonb, integer, uuid[]) from public, anon, authenticated;
revoke all on function public.open_manager_pack(uuid, text) from public, anon, authenticated;
grant execute on function public.catalog_buy_max_overall() to service_role;
grant execute on function public.market_listing_limit() to service_role;
grant execute on function public.buy_catalog_card(uuid, uuid) to service_role;
grant execute on function public.quick_sell_manager_card(uuid, uuid) to service_role;
grant execute on function public.create_market_listing(uuid, uuid, integer, integer, integer) to service_role;
grant execute on function public.place_market_bid(uuid, uuid, integer) to service_role;
grant execute on function public.buy_now_market_listing(uuid, uuid) to service_role;
grant execute on function public.draw_pack_card(jsonb, integer, uuid[]) to service_role;
grant execute on function public.open_manager_pack(uuid, text) to service_role;
