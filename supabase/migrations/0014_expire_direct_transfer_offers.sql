-- Expired offers must release their card so a seller can negotiate again.
create or replace function public.expire_direct_transfer_offers()
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  expired_count integer;
begin
  update direct_transfer_offers
  set status = 'expired', responded_at = now()
  where status = 'pending' and expires_at <= now();
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

select cron.schedule('expire-direct-transfer-offers-every-minute', '* * * * *', 'select public.expire_direct_transfer_offers()');
