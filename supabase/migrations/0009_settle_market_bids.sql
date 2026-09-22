-- Settle the highest affordable bid after a listing expires. pg_cron keeps this
-- independent of page loads, so the market behaves like a real timed auction.
create extension if not exists pg_cron;

create or replace function public.settle_expired_market_listings()
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  listing_row market_listings%rowtype;
  winning_bid record;
  card_row manager_cards%rowtype;
  settled integer := 0;
begin
  for listing_row in select * from market_listings where status = 'active' and ends_at <= now() for update skip locked loop
    select bids.bidder_id, bids.amount into winning_bid
    from market_bids bids
    join player_profiles buyer on buyer.user_id = bids.bidder_id
    where bids.listing_id = listing_row.id
      and buyer.manager_budget >= bids.amount
      and (select count(*) from manager_cards where owner_id = bids.bidder_id) < 18
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
    update player_profiles set manager_budget = manager_budget - winning_bid.amount, updated_at = now() where user_id = winning_bid.bidder_id;
    update player_profiles set manager_budget = manager_budget + floor(winning_bid.amount * 0.95), manager_budget_earned = manager_budget_earned + floor(winning_bid.amount * 0.95), updated_at = now() where user_id = listing_row.seller_id;
    update manager_cards set owner_id = winning_bid.bidder_id, acquired_price = winning_bid.amount where id = listing_row.card_id;
    update market_listings set status = 'sold', buyer_id = winning_bid.bidder_id, sold_price = winning_bid.amount where id = listing_row.id;
    settled := settled + 1;
  end loop;
  return settled;
end;
$$;

select cron.schedule('settle-friend-market-every-minute', '* * * * *', 'select public.settle_expired_market_listings()');
