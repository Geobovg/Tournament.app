-- Friend-only transfer-market actions. All mutation-sensitive rows are locked
-- so a card cannot be sold twice or bought with an insufficient balance.
create or replace function public.create_market_listing(target_seller uuid, target_card uuid, next_start_price integer, next_buy_now_price integer, duration_hours integer)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  card_row manager_cards%rowtype;
  listing_id uuid;
  low_price integer;
  high_price integer;
begin
  if duration_hours not in (1, 6, 24) then raise exception 'Velg 1, 6 eller 24 timer'; end if;
  select * into card_row from manager_cards where id = target_card for update;
  if not found or card_row.owner_id <> target_seller then raise exception 'Du eier ikke dette kortet'; end if;
  if not card_row.tradable then raise exception 'Academy-kort kan ikke selges'; end if;
  if exists (select 1 from market_listings where card_id = target_card and status = 'active') then raise exception 'Kortet ligger allerede ute'; end if;
  low_price := greatest(1, ceil(card_row.acquired_price * 0.7));
  high_price := floor(card_row.acquired_price * 1.3);
  if next_start_price < low_price or next_start_price > high_price or next_buy_now_price < next_start_price or next_buy_now_price > high_price then raise exception 'Prisen må være mellom % og % managerbudsjett', low_price, high_price; end if;
  insert into market_listings (seller_id, card_id, starting_price, buy_now_price, ends_at)
  values (target_seller, target_card, next_start_price, next_buy_now_price, now() + make_interval(hours => duration_hours)) returning id into listing_id;
  return listing_id;
end;
$$;

create or replace function public.place_market_bid(target_bidder uuid, target_listing uuid, next_amount integer)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  listing_row market_listings%rowtype;
  latest_bid integer;
  budget integer;
begin
  select * into listing_row from market_listings where id = target_listing for update;
  if not found or listing_row.status <> 'active' or listing_row.ends_at <= now() then raise exception 'Annonsen er ikke aktiv'; end if;
  if listing_row.seller_id = target_bidder then raise exception 'Du kan ikke by på eget kort'; end if;
  if not exists (select 1 from friend_requests where status = 'accepted' and ((requester_id = target_bidder and recipient_id = listing_row.seller_id) or (recipient_id = target_bidder and requester_id = listing_row.seller_id))) then raise exception 'Bare selgerens venner kan by'; end if;
  select manager_budget into budget from player_profiles where user_id = target_bidder;
  if coalesce(budget, 0) < next_amount then raise exception 'Ikke nok managerbudsjett'; end if;
  select max(amount) into latest_bid from market_bids where listing_id = target_listing;
  if next_amount < greatest(listing_row.starting_price, coalesce(latest_bid, 0) + 1) or next_amount >= listing_row.buy_now_price then raise exception 'Budet må være høyere enn gjeldende bud og lavere enn kjøp nå-prisen'; end if;
  insert into market_bids (listing_id, bidder_id, amount) values (target_listing, target_bidder, next_amount);
end;
$$;

create or replace function public.buy_now_market_listing(target_buyer uuid, target_listing uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  listing_row market_listings%rowtype;
  card_row manager_cards%rowtype;
  buyer_profile player_profiles%rowtype;
  seller_profile player_profiles%rowtype;
begin
  select * into listing_row from market_listings where id = target_listing for update;
  if not found or listing_row.status <> 'active' or listing_row.ends_at <= now() then raise exception 'Annonsen er ikke aktiv'; end if;
  if listing_row.seller_id = target_buyer then raise exception 'Du kan ikke kjøpe eget kort'; end if;
  if not exists (select 1 from friend_requests where status = 'accepted' and ((requester_id = target_buyer and recipient_id = listing_row.seller_id) or (recipient_id = target_buyer and requester_id = listing_row.seller_id))) then raise exception 'Bare selgerens venner kan kjøpe'; end if;
  select * into buyer_profile from player_profiles where user_id = target_buyer for update;
  select * into seller_profile from player_profiles where user_id = listing_row.seller_id for update;
  if buyer_profile.manager_budget < listing_row.buy_now_price then raise exception 'Ikke nok managerbudsjett'; end if;
  if (select count(*) from manager_cards where owner_id = target_buyer) >= 18 then raise exception 'Troppen din er full'; end if;
  select * into card_row from manager_cards where id = listing_row.card_id for update;
  if card_row.owner_id <> listing_row.seller_id then raise exception 'Kortet har allerede fått ny eier'; end if;
  update player_profiles set manager_budget = manager_budget - listing_row.buy_now_price, updated_at = now() where user_id = target_buyer;
  update player_profiles set manager_budget = manager_budget + floor(listing_row.buy_now_price * 0.95), manager_budget_earned = manager_budget_earned + floor(listing_row.buy_now_price * 0.95), updated_at = now() where user_id = listing_row.seller_id;
  update manager_cards set owner_id = target_buyer, acquired_price = listing_row.buy_now_price where id = listing_row.card_id;
  update market_listings set status = 'sold', buyer_id = target_buyer, sold_price = buy_now_price where id = target_listing;
  return listing_row.card_id;
end;
$$;
