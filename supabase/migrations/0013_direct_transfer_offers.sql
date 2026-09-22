-- Negotiated, friend-only transfers. A counteroffer creates a linked offer so
-- both players can always see who proposed the active price.
create table direct_transfer_offers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  card_id uuid not null references manager_cards(id) on delete cascade,
  proposed_by uuid not null references profiles(id) on delete cascade,
  parent_offer_id uuid references direct_transfer_offers(id) on delete set null,
  price integer not null check (price >= 1),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'countered', 'cancelled', 'expired')),
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (seller_id <> buyer_id),
  check (proposed_by = seller_id or proposed_by = buyer_id)
);
create unique index direct_transfer_one_pending_card_idx on direct_transfer_offers(card_id) where status = 'pending';
create index direct_transfer_user_idx on direct_transfer_offers(seller_id, buyer_id, status, created_at desc);
alter table direct_transfer_offers enable row level security;

create or replace function public.create_direct_transfer_offer(target_seller uuid, target_buyer uuid, target_card uuid, next_price integer)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  card_row manager_cards%rowtype;
  low_price integer;
  high_price integer;
  offer_id uuid;
begin
  if target_seller = target_buyer then raise exception 'Du kan ikke sende tilbud til deg selv'; end if;
  if not exists (select 1 from friend_requests where status = 'accepted' and ((requester_id = target_seller and recipient_id = target_buyer) or (recipient_id = target_seller and requester_id = target_buyer))) then raise exception 'Du kan bare sende tilbud til venner'; end if;
  select * into card_row from manager_cards where id = target_card for update;
  if not found or card_row.owner_id <> target_seller then raise exception 'Du eier ikke dette kortet'; end if;
  if not card_row.tradable then raise exception 'Academy-kort kan ikke selges'; end if;
  if exists (select 1 from market_listings where card_id = target_card and status = 'active') then raise exception 'Ta kortet av overgangsmarkedet før du sender et direkte tilbud'; end if;
  low_price := greatest(1, ceil(card_row.acquired_price * .7));
  high_price := floor(card_row.acquired_price * 1.3);
  if next_price < low_price or next_price > high_price then raise exception 'Prisen må være mellom % og % managerbudsjett', low_price, high_price; end if;
  insert into direct_transfer_offers (seller_id, buyer_id, card_id, proposed_by, price) values (target_seller, target_buyer, target_card, target_seller, next_price) returning id into offer_id;
  return offer_id;
end;
$$;

create or replace function public.respond_direct_transfer_offer(target_actor uuid, target_offer uuid, response text)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  offer_row direct_transfer_offers%rowtype;
  card_row manager_cards%rowtype;
  buyer_profile player_profiles%rowtype;
  seller_profile player_profiles%rowtype;
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
  if (select count(*) from manager_cards where owner_id = offer_row.buyer_id) >= 18 then raise exception 'Kjøperens tropp er full'; end if;
  update player_profiles set manager_budget = manager_budget - offer_row.price, updated_at = now() where user_id = offer_row.buyer_id;
  update player_profiles set manager_budget = manager_budget + floor(offer_row.price * .95), manager_budget_earned = manager_budget_earned + floor(offer_row.price * .95), updated_at = now() where user_id = offer_row.seller_id;
  update manager_cards set owner_id = offer_row.buyer_id, acquired_price = offer_row.price where id = offer_row.card_id;
  update direct_transfer_offers set status = 'accepted', responded_at = now() where id = offer_row.id;
  update direct_transfer_offers set status = 'cancelled', responded_at = now() where card_id = offer_row.card_id and status = 'pending' and id <> offer_row.id;
  update market_listings set status = 'cancelled' where card_id = offer_row.card_id and status = 'active';
  return offer_row.card_id;
end;
$$;

create or replace function public.counter_direct_transfer_offer(target_actor uuid, target_offer uuid, next_price integer)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  offer_row direct_transfer_offers%rowtype;
  card_row manager_cards%rowtype;
  low_price integer;
  high_price integer;
  counter_id uuid;
begin
  select * into offer_row from direct_transfer_offers where id = target_offer for update;
  if not found or offer_row.status <> 'pending' then raise exception 'Tilbudet er ikke lenger aktivt'; end if;
  if offer_row.expires_at <= now() then update direct_transfer_offers set status = 'expired', responded_at = now() where id = offer_row.id; raise exception 'Tilbudet har utløpt'; end if;
  if target_actor = offer_row.proposed_by or (target_actor <> offer_row.seller_id and target_actor <> offer_row.buyer_id) then raise exception 'Bare mottakeren kan foreslå ny pris'; end if;
  if not exists (select 1 from friend_requests where status = 'accepted' and ((requester_id = offer_row.seller_id and recipient_id = offer_row.buyer_id) or (recipient_id = offer_row.seller_id and requester_id = offer_row.buyer_id))) then raise exception 'Dere er ikke lenger venner'; end if;
  select * into card_row from manager_cards where id = offer_row.card_id for update;
  if not found or card_row.owner_id <> offer_row.seller_id then raise exception 'Kortet er ikke lenger tilgjengelig'; end if;
  low_price := greatest(1, ceil(card_row.acquired_price * .7));
  high_price := floor(card_row.acquired_price * 1.3);
  if next_price < low_price or next_price > high_price then raise exception 'Prisen må være mellom % og % managerbudsjett', low_price, high_price; end if;
  update direct_transfer_offers set status = 'countered', responded_at = now() where id = offer_row.id;
  insert into direct_transfer_offers (seller_id, buyer_id, card_id, proposed_by, parent_offer_id, price) values (offer_row.seller_id, offer_row.buyer_id, offer_row.card_id, target_actor, offer_row.id, next_price) returning id into counter_id;
  return counter_id;
end;
$$;
