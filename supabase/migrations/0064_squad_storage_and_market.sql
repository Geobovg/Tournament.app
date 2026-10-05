-- Kort mellom troppen, lageret og markedet:
-- * Et kort som legges ut på overgangsmarkedet, går ut av troppen (og elleveren) og ligger på lageret
--   mens det er ute. Det kan ikke flyttes inn i troppen igjen før annonsen er over. Da kan man legge
--   ut vanlig-kortet og sette informen til samme spiller inn i troppen.
-- * Et bytte mellom troppen og lageret der begge kortene er samme spiller (f.eks. vanlig-kortet og
--   informen), setter det nye kortet rett inn på plassen i elleveren eller på benken.
-- * Duplikater stopper ikke lenger pakkeåpning. Lageret kan ha flere av samme kort, så et kort av en
--   spiller som allerede er i troppen havner der (se 0054). Det er bare troppen som har maks én av hver.

-- 1) Kort på markedet ligger på lageret.
create or replace function public.move_listed_card_to_storage()
returns trigger language plpgsql set search_path = public, pg_temp
as $fn$
begin
  if new.status = 'active' then
    perform public.drop_card_from_lineup(new.seller_id, new.card_id);
    update manager_cards set location = 'storage' where id = new.card_id and owner_id = new.seller_id and location = 'squad';
  end if;
  return null;
end;
$fn$;

drop trigger if exists market_listings_move_card_to_storage on market_listings;
create trigger market_listings_move_card_to_storage
  after insert on market_listings
  for each row execute function public.move_listed_card_to_storage();

-- Kort som allerede ligger ute, flyttes også.
with listed as (
  select listing.card_id, listing.seller_id from market_listings listing
  join manager_cards card on card.id = listing.card_id and card.owner_id = listing.seller_id
  where listing.status = 'active' and card.location = 'squad'
), cleared as (
  update manager_lineups lineup
  set starters = array(select kept.id from unnest(lineup.starters) with ordinality as kept(id, ord) where kept.id not in (select card_id from listed) order by kept.ord),
      bench = array(select kept.id from unnest(lineup.bench) with ordinality as kept(id, ord) where kept.id not in (select card_id from listed) order by kept.ord),
      updated_at = now()
  where exists (select 1 from listed where listed.seller_id = lineup.user_id and (listed.card_id = any(lineup.starters) or listed.card_id = any(lineup.bench)))
)
update manager_cards set location = 'storage' where id in (select card_id from listed);

-- Et kort som ligger ute, kan ikke flyttes inn i troppen (flytt, bytt, «Velg beste tropp»).
-- Når kortet selges, bytter det eier i samme oppdatering, og da gjelder ikke sperren.
create or replace function public.keep_listed_card_out_of_squad()
returns trigger language plpgsql set search_path = public, pg_temp
as $fn$
begin
  if new.location = 'squad' and old.location is distinct from 'squad' and new.owner_id = old.owner_id
    and exists (select 1 from market_listings where card_id = new.id and status = 'active')
  then
    raise exception 'Kortet ligger ute på markedet';
  end if;
  return new;
end;
$fn$;

drop trigger if exists manager_cards_keep_listed_out_of_squad on manager_cards;
create trigger manager_cards_keep_listed_out_of_squad
  before update of location on manager_cards
  for each row execute function public.keep_listed_card_out_of_squad();

-- 2) Bytte mellom troppen og lageret. Er det samme spiller, tar det nye kortet plassen til det gamle.
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
  if outgoing.catalog_id is not null and outgoing.catalog_id = incoming.catalog_id then
    update manager_lineups
    set starters = array_replace(starters, squad_card, storage_card), bench = array_replace(bench, squad_card, storage_card), updated_at = now()
    where user_id = target_user and (squad_card = any(starters) or squad_card = any(bench));
  else
    perform public.drop_card_from_lineup(target_user, squad_card);
  end if;
  update manager_cards set location = 'storage' where id = squad_card;
  update manager_cards set location = 'squad' where id = storage_card;
end;
$fn$;

-- 3) Pakkeåpning uten duplikatsperre. Ellers lik versjonen i 0060.
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
    -- Lageret kan ha så mange av samme kort man vil.
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

drop function if exists public.has_unresolved_duplicates(uuid);

revoke all on function public.move_listed_card_to_storage() from public, anon, authenticated;
revoke all on function public.keep_listed_card_out_of_squad() from public, anon, authenticated;
revoke all on function public.swap_manager_cards(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.deliver_manager_pack(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.swap_manager_cards(uuid, uuid, uuid) to service_role;
grant execute on function public.deliver_manager_pack(uuid, text, boolean) to service_role;
