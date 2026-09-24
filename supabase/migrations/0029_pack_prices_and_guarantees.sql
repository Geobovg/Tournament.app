-- Nye priser og mer innhold i pakkene. En pakke kan nå ha flere garantinivåer, f.eks. 2× 84+ og 1× 86+.
-- Hvert nivå krever egne kort: 2× 84+ og 1× 86+ betyr tre forskjellige kort, der ett av dem er 86+.
-- guarantee_min/guarantee_count beholdes som oppsummering (laveste nivå og totalt antall garanterte kort).
alter table manager_packs add column if not exists guarantees jsonb not null default '[]'::jsonb;

update manager_packs set price = 50, card_count = 2, guarantee_min = 78, guarantee_count = 1,
  guarantees = '[{"min":78,"count":1}]',
  description = 'To kort, garantert minst ett på 78 eller bedre.'
where key = 'bronse';

update manager_packs set price = 100, card_count = 4, guarantee_min = 83, guarantee_count = 2,
  guarantees = '[{"min":83,"count":2}]',
  description = 'Fire kort, garantert minst to på 83 eller bedre.'
where key = 'solv';

update manager_packs set price = 200, card_count = 6, guarantee_min = 84, guarantee_count = 3,
  guarantees = '[{"min":84,"count":2},{"min":86,"count":1}]',
  description = 'Seks kort, garantert to på 84+ og ett på 86+.'
where key = 'gull';

update manager_packs set price = 400, card_count = 8, guarantee_min = 85, guarantee_count = 4,
  guarantees = '[{"min":85,"count":2},{"min":87,"count":1},{"min":88,"count":1}]',
  description = 'Åtte kort, garantert to på 85+, ett på 87+ og ett på 88+.'
where key = 'elite';

-- Pakker uten egne garantinivåer faller tilbake til den gamle enkle garantien.
update manager_packs set guarantees = jsonb_build_array(jsonb_build_object('min', guarantee_min, 'count', guarantee_count))
where guarantees = '[]'::jsonb;

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
  tier jsonb;
  requirement jsonb;
  requirement_min integer;
  total_weight numeric;
  roll numeric;
  running numeric;
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

  -- Garantiene sjekkes fra høyeste nivå og ned. Hvert garantert kort reserveres, så det ikke teller for flere nivåer.
  -- Mangler et kort, byttes det svakeste ureserverte kortet ut med et tilfeldig kort som oppfyller nivået.
  for requirement in select value from jsonb_array_elements(pack_row.guarantees) order by (value->>'min')::integer desc loop
    requirement_min := (requirement->>'min')::integer;
    for guarantee_index in 1..(requirement->>'count')::integer loop
      select id into qualifying from player_catalog
      where id = any(drawn) and id <> all(claimed) and overall >= requirement_min
      order by overall limit 1;
      if qualifying is null then
        select id into weakest from player_catalog where id = any(drawn) and id <> all(claimed) order by overall limit 1;
        exit when weakest is null;
        select id into replacement from player_catalog where active and overall >= requirement_min and id <> all(drawn) order by random() limit 1;
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

revoke all on function public.open_manager_pack(uuid, text) from public, anon, authenticated;
