-- Ungdomstoooor: en gratis eventpakke som alle kan åpne én gang per dag fra onsdag 7. til og med søndag 11. oktober.
-- * Fem kort, alle 86+, og minst ett av dem er garantert TOTS.
-- * Tre heldige managere får i tillegg 2000 MB i pakka. Hver gevinst låses opp på et fast tidspunkt, og den første
--   som åpner en Ungdomstoooor etter det tidspunktet, vinner den. Samme manager kan bare vinne én gang.
-- * Pakken er ikke til salgs. Den åpnes med claim_daily_pack, som sjekker tidsvinduet og dagsgrensen
--   (dag etter norsk tid) og deretter leverer pakka gratis.

-- 1) Pakker kan være gratis, ha dagsgrense og et tidsvindu, og det garanterte spesialkortet kan være TOTS.
alter table manager_packs add column if not exists daily_limit integer check (daily_limit is null or daily_limit >= 1);
alter table manager_packs add column if not exists available_from timestamptz;
alter table manager_packs add column if not exists available_until timestamptz;
alter table manager_packs drop constraint if exists manager_packs_price_check;
alter table manager_packs add constraint manager_packs_price_check check (price >= 0);
alter table manager_packs drop constraint if exists manager_packs_special_scope_check;
alter table manager_packs add constraint manager_packs_special_scope_check check (special_scope in ('current', 'all', 'tots'));

-- 2) Selve pakka. Sjansene for de fire vanlige kortene starter på 86, så alle trekkes blant 86+. De står uten
--    garanti, slik at hvert av dem også har 5 % sjanse til å bli TOTS (en garanti ville holdt dem utenfor).
--    Det femte kortet er det garanterte TOTS-kortet (88–95). Ingen inform-sjanse, siden informs kan være under 86.
--    guarantee_min/guarantee_count er bare en oppsummering og må være minst 1.
insert into manager_packs (key, name, description, price, card_count, guarantee_min, guarantee_count, guarantees, odds, accent, sort_order,
  inform_chance, tots_chance, special_guarantee, special_scope, purchasable, weekly_limit, untradable, daily_limit, available_from, available_until) values
  ('ungdomstoooor', 'Ungdomstoooor', 'Gratis! Fem kort på 86+, garantert minst én TOTS. Én per dag til og med søndag.', 0, 5, 86, 1,
    '[]',
    '[{"min":86,"max":87,"weight":70},{"min":88,"max":89,"weight":22},{"min":90,"max":99,"weight":8}]',
    '#ff2fb0', 0, 0, 0.05, 1, 'tots', false, null, false, 1,
    timestamp '2026-10-07 00:00' at time zone 'Europe/Oslo', timestamp '2026-10-12 00:00' at time zone 'Europe/Oslo')
on conflict (key) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, card_count = excluded.card_count,
  guarantee_min = excluded.guarantee_min, guarantee_count = excluded.guarantee_count, guarantees = excluded.guarantees, odds = excluded.odds,
  accent = excluded.accent, sort_order = excluded.sort_order, inform_chance = excluded.inform_chance, tots_chance = excluded.tots_chance,
  special_guarantee = excluded.special_guarantee, special_scope = excluded.special_scope, purchasable = excluded.purchasable,
  weekly_limit = excluded.weekly_limit, untradable = excluded.untradable, daily_limit = excluded.daily_limit,
  available_from = excluded.available_from, available_until = excluded.available_until, active = true;

-- 3) Gevinstene i pakka. Hver rad er én gevinst som låses opp ved release_at og går til den første som åpner pakka etterpå.
create table if not exists pack_jackpots (
  id uuid primary key default gen_random_uuid(),
  pack_key text not null references manager_packs(key) on delete cascade,
  amount integer not null check (amount > 0),
  release_at timestamptz not null,
  winner_id uuid references auth.users(id) on delete set null,
  won_at timestamptz
);
alter table pack_jackpots enable row level security;
create unique index if not exists pack_jackpots_one_per_winner on pack_jackpots (pack_key, winner_id) where winner_id is not null;

-- Torsdag kveld, lørdag ettermiddag og søndag formiddag, så gevinstene er spredt utover uka.
insert into pack_jackpots (pack_key, amount, release_at)
select 'ungdomstoooor', 2000, release_at
from unnest(array[
  timestamp '2026-10-08 20:00' at time zone 'Europe/Oslo',
  timestamp '2026-10-10 14:00' at time zone 'Europe/Oslo',
  timestamp '2026-10-11 11:00' at time zone 'Europe/Oslo'
]) as release_at
where not exists (select 1 from pack_jackpots where pack_key = 'ungdomstoooor');

-- 4) Starten på dagen i dag, norsk tid.
create or replace function public.oslo_day_start(at timestamptz default now())
returns timestamptz language sql stable set search_path = public, pg_temp
as $fn$ select date_trunc('day', at at time zone 'Europe/Oslo') at time zone 'Europe/Oslo' $fn$;

-- 5) Åpner en dagspakke gratis. Profilen låses først, så to samtidige åpninger ikke kan snike seg forbi dagsgrensen.
--    Returnerer kortene og eventuell gevinst: {"pulls": [...], "jackpot": 2000}.
create or replace function public.claim_daily_pack(target_user uuid, target_pack text)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  pack_row manager_packs%rowtype;
  pulls jsonb;
  jackpot_row pack_jackpots%rowtype;
  won integer := 0;
begin
  perform 1 from player_profiles where user_id = target_user for update;
  if not found then raise exception 'Fant ikke managerprofilen'; end if;
  select * into pack_row from manager_packs where key = target_pack and active;
  if not found then raise exception 'Pakken finnes ikke'; end if;
  if pack_row.daily_limit is null
    or (pack_row.available_from is not null and now() < pack_row.available_from)
    or (pack_row.available_until is not null and now() >= pack_row.available_until) then
    raise exception 'Denne pakken er ikke tilgjengelig nå';
  end if;
  if (select count(*) from pack_openings where user_id = target_user and pack_key = target_pack and created_at >= public.oslo_day_start()) >= pack_row.daily_limit then
    raise exception 'Du har allerede åpnet denne pakken i dag';
  end if;

  pulls := public.deliver_manager_pack(target_user, target_pack, false);

  -- Den eldste ulåste gevinsten som ingen har tatt ennå. skip locked gjør at to samtidige åpninger ikke tar samme gevinst.
  if not exists (select 1 from pack_jackpots where pack_key = target_pack and winner_id = target_user) then
    select * into jackpot_row from pack_jackpots
    where pack_key = target_pack and winner_id is null and release_at <= now()
    order by release_at limit 1
    for update skip locked;
    if found then
      update pack_jackpots set winner_id = target_user, won_at = now() where id = jackpot_row.id;
      update player_profiles set manager_budget = manager_budget + jackpot_row.amount, manager_budget_earned = manager_budget_earned + jackpot_row.amount, updated_at = now()
      where user_id = target_user;
      won := jackpot_row.amount;
    end if;
  end if;

  return jsonb_build_object('pulls', pulls, 'jackpot', won);
end;
$fn$;

-- 6) Hvor mange dagspakker manageren har åpnet i dag, per pakke.
create or replace function public.daily_packs_opened(target_user uuid)
returns jsonb language sql stable set search_path = public, pg_temp
as $fn$
  select coalesce(jsonb_object_agg(pack_key, opened), '{}'::jsonb)
  from (
    select opening.pack_key, count(*) as opened from pack_openings opening
    join manager_packs pack on pack.key = opening.pack_key and pack.daily_limit is not null
    where opening.user_id = target_user and opening.created_at >= public.oslo_day_start()
    group by opening.pack_key
  ) counts;
$fn$;

revoke all on function public.oslo_day_start(timestamptz) from public, anon, authenticated;
revoke all on function public.claim_daily_pack(uuid, text) from public, anon, authenticated;
revoke all on function public.daily_packs_opened(uuid) from public, anon, authenticated;
grant execute on function public.oslo_day_start(timestamptz) to service_role;
grant execute on function public.claim_daily_pack(uuid, text) to service_role;
grant execute on function public.daily_packs_opened(uuid) to service_role;
