-- Spesialkort, tredje type: Icons (legender, som i FC).
-- * 20 pensjonerte legender med rating 90–97. De ligger i katalogen med active = false, så de aldri trekkes som
--   vanlige kort, ikke kan kjøpes i katalogen og ikke blir inform. Liga er 'icons' og klubb er 'Icons'.
-- * Alle 20 kommer i én Icon-runde som ikke slutter å gjelde. Kortet har samme rating som legenden (boost 0).
-- * Kortet koster 2,5 ganger verdien på ratingen (TOTS er 2 ganger). Icons fra vanlige pakker kan selges på
--   markedet og hurtigselges som andre kort.
-- * Icons er sjeldnere enn TOTS: vanlige pakker har en femdel av TOTS-sjansen, og spesialpakken gir Icon i
--   5 % av trekkene ('special_pack_icon_chance'). Icon-sjansen sjekkes før TOTS og inform i pakkene.

-- 1) Icon er en ny type i rundene og kortene. Icons har ikke noe vanlig kort å løfte, så boosten kan være 0.
alter table special_rounds drop constraint if exists special_rounds_kind_check;
alter table special_rounds add constraint special_rounds_kind_check check (kind in ('inform', 'tots', 'icon'));
alter table special_cards drop constraint if exists special_cards_kind_check;
alter table special_cards add constraint special_cards_kind_check check (kind in ('inform', 'tots', 'icon'));
alter table special_cards drop constraint if exists special_cards_boost_check;
alter table special_cards add constraint special_cards_boost_check
  check ((boost >= 1 or (kind = 'icon' and boost = 0)) and (kind <> 'inform' or boost <= 3));

-- 2) Legendene i katalogen. Nasjonen brukes av SBC-ene og står også i src/lib/player-nationalities.ts.
with icons (slug, name, position, overall, nation, pace, shooting, passing, dribbling, defending, physical) as (values
  ('icon-pele',             'Pelé',               'CAM', 97, 'br', 95, 96, 93, 96, 60, 76),
  ('icon-maradona',         'Diego Maradona',     'CAM', 97, 'ar', 92, 93, 93, 98, 40, 75),
  ('icon-ronaldo-nazario',  'Ronaldo Nazário',    'ST',  96, 'br', 97, 97, 81, 96, 45, 80),
  ('icon-zidane',           'Zinédine Zidane',    'CAM', 96, 'fr', 82, 90, 96, 96, 73, 87),
  ('icon-cruyff',           'Johan Cruyff',       'ST',  95, 'nl', 92, 92, 92, 96, 42, 73),
  ('icon-beckenbauer',      'Franz Beckenbauer',  'CB',  95, 'de', 82, 70, 89, 86, 96, 86),
  ('icon-maldini',          'Paolo Maldini',      'LB',  94, 'it', 88, 55, 81, 80, 96, 86),
  ('icon-ronaldinho',       'Ronaldinho',         'LW',  94, 'br', 91, 90, 92, 97, 40, 78),
  ('icon-eusebio',          'Eusébio',            'ST',  93, 'pt', 95, 94, 82, 91, 40, 82),
  ('icon-yashin',           'Lev Yashin',         'GK',  93, 'ru', 81, 71, 88, 87, 90, 93),
  ('icon-henry',            'Thierry Henry',      'LW',  93, 'fr', 96, 92, 84, 92, 45, 79),
  ('icon-puskas',           'Ferenc Puskás',      'ST',  93, 'hu', 85, 96, 88, 91, 40, 77),
  ('icon-gullit',           'Ruud Gullit',        'CM',  92, 'nl', 86, 88, 88, 89, 78, 91),
  ('icon-van-basten',       'Marco van Basten',   'ST',  92, 'nl', 86, 94, 81, 89, 42, 84),
  ('icon-kaka',             'Kaká',               'CAM', 92, 'br', 93, 88, 89, 91, 45, 78),
  ('icon-pirlo',            'Andrea Pirlo',       'CM',  91, 'it', 66, 82, 96, 90, 66, 68),
  ('icon-xavi',             'Xavi',               'CM',  91, 'es', 72, 76, 96, 92, 66, 68),
  ('icon-buffon',           'Gianluigi Buffon',   'GK',  91, 'it', 79, 69, 86, 85, 88, 91),
  ('icon-cannavaro',        'Fabio Cannavaro',    'CB',  90, 'it', 82, 50, 72, 74, 93, 85),
  ('icon-roberto-carlos',   'Roberto Carlos',     'LB',  90, 'br', 93, 82, 84, 84, 84, 86)
)
insert into player_catalog (slug, name, position, overall, price, attributes, accent, active, club, league, nation)
select slug, name, position, overall, public.card_value_for_overall(overall),
  jsonb_build_object('pace', pace, 'shooting', shooting, 'passing', passing, 'dribbling', dribbling, 'defending', defending, 'physical', physical),
  '#d4af37', false, 'Icons', 'icons', nation
from icons
on conflict (slug) do nothing;

-- 3) Icon-runden og de 20 kortene.
insert into special_rounds (kind, starts_at, ends_at) values ('icon', '2026-10-08 00:00:00+02', '2100-01-01 00:00:00+00')
on conflict (kind, starts_at) do nothing;

insert into special_cards (round_id, kind, catalog_id, overall, boost, attributes, price)
select round.id, 'icon', catalog.id, catalog.overall, 0, catalog.attributes, ceil(public.card_value_for_overall(catalog.overall) * 2.5)::integer
from player_catalog catalog
cross join (select id from special_rounds where kind = 'icon' and starts_at = '2026-10-08 00:00:00+02') round
where catalog.league = 'icons' and not catalog.active
on conflict (round_id, catalog_id) do nothing;

-- 4) Icon-sjansen i vanlige pakker, en femdel av TOTS-sjansen. Spesialpakken gir Icon i 5 % av trekkene.
alter table manager_packs add column if not exists icon_chance numeric not null default 0 check (icon_chance between 0 and 1);
update manager_packs set icon_chance = 0.0003 where key = 'bronse';
update manager_packs set icon_chance = 0.0005 where key = 'solv';
update manager_packs set icon_chance = 0.003 where key = 'gull';
update manager_packs set icon_chance = 0.006 where key = 'elite';
insert into game_settings (key, value) values ('special_pack_icon_chance', '0.05') on conflict (key) do nothing;

-- 5) 'icons' trekker blant Icon-kortene. 'all' (spesialpakken) velger først Icon, så TOTS, ellers inform.
--    De andre scopene er uendret fra 0067.
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
  icon_chance numeric;
begin
  if scope = 'all' then
    icon_chance := coalesce((select (value #>> '{}')::numeric from game_settings where key = 'special_pack_icon_chance'), 0.05);
    tots_chance := coalesce((select (value #>> '{}')::numeric from game_settings where key = 'special_pack_tots_chance'), 0.25);
    roll := random();
    picked := public.draw_special_card(case when roll < icon_chance then 'icons' when roll < icon_chance + tots_chance then 'tots' else 'informs' end, excluded);
    -- Er typen tom, faller den tilbake på de vanligere typene.
    if picked is null then picked := public.draw_special_card('tots', excluded); end if;
    if picked is null then picked := public.draw_special_card('informs', excluded); end if;
    return picked;
  end if;

  -- Icons trekkes jevnt: de er alle 90+, så ratinglagene under ville ikke gjort noen forskjell.
  if scope = 'icons' then
    select id into picked from special_cards where kind = 'icon' and id <> all(coalesce(excluded, '{}')) order by random() limit 1;
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

-- 6) Pakkeåpning med Icon-sjanse. Ellers lik versjonen i 0065.
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

  -- Icons først, siden de er sjeldnest: hvert kort som ikke er garantert, kan bli en Icon. Samme mekanikk som
  -- inform og TOTS under, og kort som blir Icon, kan ikke også bli inform eller TOTS.
  chance := pack_row.icon_chance * public.manager_inform_factor(target_user)
    * cardinality(drawn) / greatest(1, cardinality(drawn) - cardinality(claimed));
  if chance > 0 then
    for slot_index in 1..cardinality(drawn) loop
      continue when drawn[slot_index] = any(claimed) or random() >= chance;
      picked := public.draw_special_card('icons', used_specials);
      exit when picked is null;
      used_specials := used_specials || picked;
      slot_special[slot_index] := picked;
      slot_catalog[slot_index] := (select catalog_id from special_cards where id = picked);
    end loop;
  end if;

  -- Hvert kort som ikke er garantert, kan bli en av ukens informs. Garanterte kort holdes utenfor, så
  -- sjansen for de andre løftes tilsvarende, og snittet per kort i pakka blir inform_chance. Arenaen løfter den litt.
  chance := pack_row.inform_chance * public.manager_inform_factor(target_user)
    * cardinality(drawn) / greatest(1, cardinality(drawn) - cardinality(claimed));
  if chance > 0 then
    for slot_index in 1..cardinality(drawn) loop
      continue when drawn[slot_index] = any(claimed) or slot_special[slot_index] is not null or random() >= chance;
      picked := public.draw_special_card('current', used_specials);
      exit when picked is null;
      used_specials := used_specials || picked;
      slot_special[slot_index] := picked;
      slot_catalog[slot_index] := (select catalog_id from special_cards where id = picked);
    end loop;
  end if;

  -- Samme mekanikk for TOTS, men bare for kort som ikke allerede ble Icon eller inform.
  chance := pack_row.tots_chance * public.manager_inform_factor(target_user)
    * cardinality(drawn) / greatest(1, cardinality(drawn) - cardinality(claimed));
  if chance > 0 then
    for slot_index in 1..cardinality(drawn) loop
      continue when drawn[slot_index] = any(claimed) or slot_special[slot_index] is not null or random() >= chance;
      picked := public.draw_special_card('tots', used_specials);
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

revoke all on function public.draw_special_card(text, uuid[]) from public, anon, authenticated;
revoke all on function public.deliver_manager_pack(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.draw_special_card(text, uuid[]) to service_role;
grant execute on function public.deliver_manager_pack(uuid, text, boolean) to service_role;
