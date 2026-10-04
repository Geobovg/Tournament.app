-- Maks ett kort av samme spiller i troppen (elleveren, benken og reservene). Klubblageret kan
-- fortsatt ha flere. Nye kort og kort man kjøper på markedet havner på lageret hvis spilleren
-- allerede er i troppen, og flytting inn i troppen som ville gitt et duplikat stoppes.

-- 1) Rydd opp: kort som allerede ligger dobbelt i troppen. Kortet som står i elleveren eller på
--    benken blir værende, ellers det beste og så det eldste. Resten flyttes til lageret.
with ranked as (
  select card.id, card.owner_id,
    row_number() over (
      partition by card.owner_id, card.catalog_id
      order by (card.id = any(coalesce(lineup.starters, '{}'))) desc, (card.id = any(coalesce(lineup.bench, '{}'))) desc,
        card.overall desc, card.created_at, card.id
    ) as copy_number
  from manager_cards card
  left join manager_lineups lineup on lineup.user_id = card.owner_id
  where card.location = 'squad' and card.catalog_id is not null
), extra as (
  select id, owner_id from ranked where copy_number > 1
), cleared as (
  update manager_lineups lineup
  set starters = array(select kept.id from unnest(lineup.starters) with ordinality as kept(id, ord) where kept.id not in (select id from extra) order by kept.ord),
      bench = array(select kept.id from unnest(lineup.bench) with ordinality as kept(id, ord) where kept.id not in (select id from extra) order by kept.ord),
      updated_at = now()
  where exists (select 1 from extra where extra.owner_id = lineup.user_id and (extra.id = any(lineup.starters) or extra.id = any(lineup.bench)))
)
update manager_cards set location = 'storage' where id in (select id from extra);

-- 2) Nye kort (pakker, katalogkjøp) og kort som bytter eier (markedet, direkte overganger) sendes
--    rett til lageret i stedet for å bli et duplikat i troppen.
create or replace function public.redirect_squad_duplicate_to_storage()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  if new.location = 'squad' and new.catalog_id is not null
    and (tg_op = 'INSERT' or old.owner_id is distinct from new.owner_id)
    and exists (select 1 from manager_cards other where other.owner_id = new.owner_id and other.catalog_id = new.catalog_id and other.location = 'squad' and other.id <> new.id)
  then
    new.location := 'storage';
  end if;
  return new;
end;
$fn$;

drop trigger if exists manager_cards_redirect_squad_duplicate on manager_cards;
create trigger manager_cards_redirect_squad_duplicate
  before insert or update of owner_id, location on manager_cards
  for each row execute function public.redirect_squad_duplicate_to_storage();

-- 3) Alt annet som ville gitt to av samme spiller i troppen (flytt, bytt, «Velg beste tropp») stoppes.
--    Sjekken venter til slutten av transaksjonen, så et bytte der ett kort går ut og et annet av samme
--    spiller går inn i samme oppdatering ikke stoppes underveis.
create or replace function public.check_one_copy_in_squad()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  if new.location = 'squad' and new.catalog_id is not null
    and (select count(*) from manager_cards other where other.owner_id = new.owner_id and other.catalog_id = new.catalog_id and other.location = 'squad') > 1
  then
    raise exception 'Du har allerede denne spilleren i troppen';
  end if;
  return null;
end;
$fn$;

drop trigger if exists manager_cards_one_copy_in_squad on manager_cards;
create constraint trigger manager_cards_one_copy_in_squad
  after insert or update of owner_id, location, catalog_id on manager_cards
  deferrable initially deferred
  for each row execute function public.check_one_copy_in_squad();

-- 4) Pakkeåpningen viser riktig plass for kort som ble sendt til lageret, og en tropplass som ikke ble
--    brukt, går til neste kort i pakka. Ellers lik versjonen i 0034.
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
    -- Triggeren sender kortet til lageret hvis spilleren allerede er i troppen, så plassen leses tilbake fra raden.
    slot := case when free_squad > 0 then 'squad' else 'storage' end;
    insert into manager_cards (owner_id, catalog_id, name, position, overall, attributes, acquired_price, location)
    values (target_user, card_row.id, card_row.name, card_row.position, card_row.overall, card_row.attributes, card_row.price, slot)
    returning id, location into new_card_id, slot;
    if slot = 'squad' then free_squad := free_squad - 1; else free_storage := free_storage - 1; end if;
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
