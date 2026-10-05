-- Spesialpakken gir TOTS, informs selges litt dyrere, og elitepakken gir litt sjeldnere spesialkort.
-- * Spesialpakken (SBC) trakk før blant alle spesialkort etter rating. TOTS-kortene er 88–95, så de havnet i
--   de sjeldneste ratinglagene og kom nesten aldri. Nå avgjøres først typen: TOTS med sjansen i
--   game_settings ('special_pack_tots_chance', 25 %), ellers inform. Innen typen trekkes det som før.
-- * Hurtigsalg av inform gir 30 % av verdien i stedet for 25 %, så de gir litt mer enn vanlige kort.
-- * Elitepakken: inform-sjansen går fra 8 % til 6 % per kort, og TOTS fra 4 % til 3 %.

insert into game_settings (key, value) values ('special_pack_tots_chance', '0.25') on conflict (key) do nothing;

-- 1) 'all' (spesialpakken) velger først TOTS eller inform, deretter kort som før. 'informs' trekker blant
--    alle informs som noen gang er laget. 'current' og 'tots' er uendret.
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
  tots_chance numeric;
begin
  if scope = 'all' then
    tots_chance := coalesce((select (value #>> '{}')::numeric from game_settings where key = 'special_pack_tots_chance'), 0.25);
    picked := public.draw_special_card(case when random() < tots_chance then 'tots' else 'informs' end, excluded);
    -- Er den ene typen tom, faller den tilbake på den andre.
    if picked is null then picked := public.draw_special_card('tots', excluded); end if;
    if picked is null then picked := public.draw_special_card('informs', excluded); end if;
    return picked;
  end if;

  if scope = 'current' then current_round := public.ensure_special_round(); end if;
  candidates := array(
    select id from special_cards
    where ((scope = 'current' and round_id = current_round) or (scope = 'tots' and kind = 'tots') or (scope = 'informs' and kind = 'inform'))
      and id <> all(coalesce(excluded, '{}'))
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

-- 2) Hurtigsalg: 30 % for inform, 25 % for alt annet. Ellers lik versjonen i 0060.
create or replace function public.quick_sell_manager_card(target_user uuid, target_card uuid)
returns integer
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  card_row manager_cards%rowtype;
  payout integer;
  rate numeric := 0.25;
begin
  select * into card_row from manager_cards where id = target_card for update;
  if not found or card_row.owner_id <> target_user then raise exception 'Du eier ikke dette kortet'; end if;
  if not card_row.tradable and card_row.special_card_id is null then raise exception 'Academy-kort kan ikke selges'; end if;
  if exists (select 1 from market_listings where card_id = target_card and status = 'active') then raise exception 'Kortet ligger ute på markedet'; end if;
  if exists (select 1 from special_cards where id = card_row.special_card_id and kind = 'inform') then rate := 0.30; end if;
  payout := coalesce(floor(public.manager_card_value(target_card) * rate)::integer, 0);
  perform public.drop_card_from_lineup(target_user, target_card);
  delete from manager_cards where id = target_card;
  update player_profiles set manager_budget = manager_budget + payout, manager_budget_earned = manager_budget_earned + payout, updated_at = now() where user_id = target_user;
  return payout;
end;
$fn$;

-- 3) Elitepakken gir litt sjeldnere spesialkort.
update manager_packs set inform_chance = 0.06, tots_chance = 0.03 where key = 'elite';

revoke all on function public.draw_special_card(text, uuid[]) from public, anon, authenticated;
revoke all on function public.quick_sell_manager_card(uuid, uuid) from public, anon, authenticated;
grant execute on function public.draw_special_card(text, uuid[]) to service_role;
grant execute on function public.quick_sell_manager_card(uuid, uuid) to service_role;
