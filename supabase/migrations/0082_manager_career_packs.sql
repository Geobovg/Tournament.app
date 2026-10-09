-- Pakkene er tilbake i Managerkarrieren, i en FC-aktig serie som passer en tidlig karriere.
-- * Fem pakker: Gullpakke (40 MB), Gull spillerpakke (75 MB), Premium gull (100 MB), Sjeldne spillere (200 MB)
--   og Jumbo premium gull (300 MB). Gull og Premium gull kan kjøpes fritt, de tre andre maks 3 ganger per dag
--   (dag etter norsk tid). Som i FC er hurtigsalgsverdien av en pakke godt under prisen (40–55 %).
-- * Sjansene er satt etter kortfordelingen i katalogen. Omtrentlig sjanse for minst ett 84+ per pakke:
--   2 %, 4 %, 9 %, 25 % og 25 %; 86+ er under 1,5 % i de tre billigste og rundt 4 % i de to dyreste.
-- * Hvert kort som ikke er garantert, kan bli en av ukens informs (0,1–1 % per kort). Ingen TOTS eller Icon.
-- * Opprykk i AI-sesongen gir en pakke i tillegg til MB: opp til divisjon 9–7 Gullpakke, 6–2 Premium gull,
--   1 Sjeldne spillere, og ny arena Jumbo premium gull.
-- * Informs går ikke lenger over 89: bare spillere under 89 kan få inform, og kortet stopper på 89.
--   Informs fra før denne migreringen teller ikke, så kjeden og topp 20-grensen starter på nytt.
-- * De gamle pakkene (bronse, sølv, gull, elite, Allpacka, spesialpakken og Ungdomstoooor) er fortsatt av.

-- 1) Kjøpsgrense per dag, skilt fra daily_limit (som er gratis dagspakker).
alter table manager_packs add column if not exists daily_purchase_limit integer check (daily_purchase_limit is null or daily_purchase_limit >= 1);

update manager_packs set active = false, purchasable = false
where key not in ('gullpakke', 'gull_spillere', 'premium_gull', 'sjeldne_spillere', 'jumbo_premium_gull');

-- Oddsen er vekter per ratingsjikt (se 0034). Garantiene trekker bare blant sjiktene som når kravet, med samme vekter.
-- Sjeldne spillere har ingen sjikt under 80, så alle kortene er 80+ uten egen garanti for det.
insert into manager_packs (key, name, description, price, card_count, guarantee_min, guarantee_count, guarantees, odds, accent, sort_order,
  inform_chance, tots_chance, icon_chance, special_guarantee, special_scope, purchasable, weekly_limit, daily_purchase_limit, untradable, daily_limit, available_from, available_until) values
  ('gullpakke', 'Gullpakke', 'Tre kort, garantert minst ett på 75 eller bedre.', 40, 3, 75, 1,
    '[{"min":75,"count":1}]',
    '[{"min":40,"max":74,"weight":52},{"min":75,"max":79,"weight":40},{"min":80,"max":82,"weight":7},{"min":83,"max":83,"weight":0.5},{"min":84,"max":85,"weight":0.6},{"min":86,"max":87,"weight":0.06},{"min":88,"max":89,"weight":0.012},{"min":90,"max":99,"weight":0.002}]',
    '#f2c94c', 1, 0.001, 0, 0, 0, 'current', true, null, null, false, null, null, null),
  ('gull_spillere', 'Gull spillerpakke', 'Fem kort, garantert minst ett på 78 eller bedre. Maks 3 per dag.', 75, 5, 78, 1,
    '[{"min":78,"count":1}]',
    '[{"min":40,"max":74,"weight":45},{"min":75,"max":79,"weight":45},{"min":80,"max":82,"weight":9},{"min":83,"max":83,"weight":0.7},{"min":84,"max":85,"weight":0.65},{"min":86,"max":87,"weight":0.08},{"min":88,"max":89,"weight":0.016},{"min":90,"max":99,"weight":0.003}]',
    '#d9a441', 2, 0.002, 0, 0, 0, 'current', true, null, 3, false, null, null, null),
  ('premium_gull', 'Premium gullpakke', 'Seks kort, garantert minst to på 80 eller bedre.', 100, 6, 80, 2,
    '[{"min":80,"count":2}]',
    '[{"min":40,"max":74,"weight":40},{"min":75,"max":79,"weight":48},{"min":80,"max":82,"weight":10.5},{"min":83,"max":83,"weight":0.9},{"min":84,"max":85,"weight":0.45},{"min":86,"max":87,"weight":0.065},{"min":88,"max":89,"weight":0.013},{"min":90,"max":99,"weight":0.0025}]',
    '#ffe08a', 3, 0.004, 0, 0, 0, 'current', true, null, null, false, null, null, null),
  ('sjeldne_spillere', 'Sjeldne spillere', 'Fem kort, alle på 80 eller bedre, og minst ett på 83+. Maks 3 per dag.', 200, 5, 83, 1,
    '[{"min":83,"count":1}]',
    '[{"min":80,"max":82,"weight":88},{"min":83,"max":83,"weight":9.5},{"min":84,"max":85,"weight":2.6},{"min":86,"max":87,"weight":0.4},{"min":88,"max":89,"weight":0.07},{"min":90,"max":99,"weight":0.014}]',
    '#ffb703', 4, 0.01, 0, 0, 0, 'current', true, null, 3, false, null, null, null),
  ('jumbo_premium_gull', 'Jumbo premium gull', 'Tolv kort, garantert tre på 80+ og ett på 83+. Maks 3 per dag.', 300, 12, 80, 4,
    '[{"min":83,"count":1},{"min":80,"count":3}]',
    '[{"min":40,"max":74,"weight":40},{"min":75,"max":79,"weight":46},{"min":80,"max":82,"weight":11},{"min":83,"max":83,"weight":1.2},{"min":84,"max":85,"weight":0.25},{"min":86,"max":87,"weight":0.04},{"min":88,"max":89,"weight":0.008},{"min":90,"max":99,"weight":0.0015}]',
    '#ff8a3d', 5, 0.006, 0, 0, 0, 'current', true, null, 3, false, null, null, null)
on conflict (key) do update set
  name = excluded.name, description = excluded.description, price = excluded.price, card_count = excluded.card_count,
  guarantee_min = excluded.guarantee_min, guarantee_count = excluded.guarantee_count, guarantees = excluded.guarantees, odds = excluded.odds,
  accent = excluded.accent, sort_order = excluded.sort_order, inform_chance = excluded.inform_chance, tots_chance = excluded.tots_chance,
  icon_chance = excluded.icon_chance, special_guarantee = excluded.special_guarantee, special_scope = excluded.special_scope,
  purchasable = excluded.purchasable, weekly_limit = excluded.weekly_limit, daily_purchase_limit = excluded.daily_purchase_limit,
  untradable = excluded.untradable, daily_limit = excluded.daily_limit, available_from = excluded.available_from,
  available_until = excluded.available_until, active = true;

-- 2) Informs maks 89, og historikken starter på nytt fra denne ukens runde.
insert into game_settings (key, value) values ('inform_max_overall', '89') on conflict (key) do update set value = excluded.value, updated_at = now();
insert into game_settings (key, value) values ('inform_history_from', to_jsonb(public.sbc_week_bounds()->>'week_start'))
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Ukens runde kan være trukket med de gamle reglene. Ingen eier kort fra den etter nullstillingen i 0081,
-- så den slettes og trekkes på nytt neste gang noen trenger den.
delete from special_rounds round
where round.kind = 'inform' and round.starts_at = (public.sbc_week_bounds()->>'week_start')::timestamptz
  and not exists (select 1 from manager_cards card join special_cards special on special.id = card.special_card_id where special.round_id = round.id);

create or replace function public.ensure_special_round()
returns uuid
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  bounds jsonb := public.sbc_week_bounds();
  week_start timestamptz := (bounds->>'week_start')::timestamptz;
  round_id uuid;
  round_size integer := public.game_setting_int('inform_round_size', 25);
  pool_size integer := public.game_setting_int('inform_pool_size', 400);
  protected_top integer := public.game_setting_int('inform_protected_top', 20);
  protected_max integer := public.game_setting_int('inform_protected_max', 1);
  cooldown integer := public.game_setting_int('inform_cooldown_rounds', 2);
  max_overall integer := public.game_setting_int('inform_max_overall', 89);
  history_from timestamptz := coalesce((select (value #>> '{}')::timestamptz from game_settings where key = 'inform_history_from'), '-infinity');
begin
  select id into round_id from special_rounds where kind = 'inform' and starts_at = week_start;
  if round_id is not null then return round_id; end if;
  -- To samtidige forespørsler skal ikke lage to runder.
  perform pg_advisory_xact_lock(hashtext('special_rounds:inform'));
  select id into round_id from special_rounds where kind = 'inform' and starts_at = week_start;
  if round_id is not null then return round_id; end if;

  insert into special_rounds (kind, starts_at, ends_at) values ('inform', week_start, (bounds->>'next_reset')::timestamptz)
  returning id into round_id;

  with ranked as (
    select catalog.id, catalog.overall, catalog.attributes,
      row_number() over (order by catalog.overall desc, catalog.price desc, catalog.id) as rank
    from player_catalog catalog where catalog.active
  ),
  recent as (
    select card.catalog_id from special_cards card
    where card.round_id in (select id from special_rounds where kind = 'inform' and starts_at < week_start order by starts_at desc limit cooldown)
  ),
  latest as (
    select distinct on (card.catalog_id) card.catalog_id, card.overall, card.attributes
    from special_cards card join special_rounds round on round.id = card.round_id
    where card.kind = 'inform' and round.starts_at >= history_from order by card.catalog_id, round.starts_at desc
  ),
  earlier as (
    select card.catalog_id, count(*) as informs from special_cards card join special_rounds round on round.id = card.round_id
    where card.kind = 'inform' and round.starts_at >= history_from group by card.catalog_id
  ),
  eligible as (
    select ranked.id, coalesce(latest.overall, ranked.overall) as from_overall, coalesce(latest.attributes, ranked.attributes) as from_attributes
    from ranked
    left join latest on latest.catalog_id = ranked.id
    left join earlier on earlier.catalog_id = ranked.id
    where ranked.rank <= pool_size
      and ranked.id not in (select catalog_id from recent)
      and not (ranked.rank <= protected_top and coalesce(earlier.informs, 0) >= protected_max)
      and ranked.overall < max_overall
      and coalesce(latest.overall, ranked.overall) < max_overall
  ),
  picked as (
    select eligible.* from eligible order by random() limit round_size
  ),
  -- Egen trekning for boosten. Den kan ikke deles med sorteringen over, da ville de laveste trekkene alltid vunnet.
  rolled as (
    select picked.*, (select random() where picked.id is not null) as roll from picked
  ),
  boosted as (
    select rolled.*, least(max_overall - from_overall, case when roll < 0.6 then 1 when roll < 0.9 then 2 else 3 end) as boost from rolled
  )
  insert into special_cards (round_id, kind, catalog_id, overall, boost, attributes, price)
  select round_id, 'inform', boosted.id, boosted.from_overall + boosted.boost, boosted.boost,
    coalesce((select jsonb_object_agg(attribute.key, least(99, attribute.value::integer + boosted.boost)) from jsonb_each_text(boosted.from_attributes) as attribute), '{}'::jsonb),
    ceil(public.card_value_for_overall(boosted.from_overall + boosted.boost) * 1.5)::integer
  from boosted;

  return round_id;
end;
$fn$;

-- 3) Pakkeåpning med kjøpsgrense per dag. Ellers lik versjonen i 0074.
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
    if pack_row.daily_purchase_limit is not null
      and (select count(*) from pack_openings where user_id = target_user and pack_key = target_pack and price > 0 and created_at >= public.oslo_day_start()) >= pack_row.daily_purchase_limit then
      raise exception 'Du har kjøpt denne pakken % ganger i dag. Prøv igjen i morgen', pack_row.daily_purchase_limit;
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

-- 4) Gratispakker (opprykkspremien) havner i manager_pack_inventory igjen.
create or replace function public.grant_pack(target_user uuid, target_pack text, amount integer)
returns void language sql set search_path = public, pg_temp
as $fn$
  insert into manager_pack_inventory (user_id, pack_key, quantity) select target_user, target_pack, amount where amount > 0
  on conflict (user_id, pack_key) do update set quantity = manager_pack_inventory.quantity + excluded.quantity, updated_at = now();
$fn$;

-- 5) Hvor mange av hver pakke manageren har kjøpt i dag, norsk tid. Gratispakker teller ikke.
create or replace function public.daily_packs_bought(target_user uuid)
returns jsonb language sql stable set search_path = public, pg_temp
as $fn$
  select coalesce(jsonb_object_agg(pack_key, bought), '{}'::jsonb)
  from (
    select pack_key, count(*) as bought from pack_openings
    where user_id = target_user and price > 0 and created_at >= public.oslo_day_start()
    group by pack_key
  ) counts;
$fn$;

-- 6) Opprykk gir en pakke i tillegg til MB. Ellers lik versjonen i 0081.
create or replace function public.finish_ai_season(target_season uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  season_row career_ai_seasons%rowtype;
  playoff career_season_matches%rowtype;
  user_position integer;
  next_outcome text;
  factor numeric;
  new_arena integer;
  new_division integer;
  opponent_name text;
  opponent_arena integer;
  opponent_division integer;
begin
  select * into season_row from career_ai_seasons where id = target_season for update;
  if not found or season_row.status <> 'active' then return; end if;
  if exists (select 1 from career_season_matches where ai_season_id = target_season and stage = 'league' and status <> 'completed') then return; end if;
  factor := public.ai_arena_factor(season_row.arena);

  select table_position into user_position from public.season_standings(target_season, null) where participant = season_row.user_id::text;

  select * into playoff from career_season_matches where ai_season_id = target_season and stage = 'playoff';
  if found then
    if playoff.status <> 'completed' then return; end if;
    -- Brukeren står alltid som hjemmelag i kvalikkampen. Står det likt etter ekstraomgangene, avgjør straffene.
    next_outcome := case
      when playoff.home_score > playoff.away_score then 'promoted'
      when playoff.home_score = playoff.away_score and exists (
        select 1 from career_matches m
        where m.id = playoff.match_id and m.home_penalties > m.away_penalties
      ) then 'promoted'
      else 'stayed' end;
  elsif user_position = public.ai_playoff_position(season_row.arena, season_row.division) then
    -- Motstanderen er en klubb fra divisjonen over, eller fra divisjon 10 i neste arena.
    if season_row.division = 1 then opponent_arena := season_row.arena + 1; opponent_division := 10;
    else opponent_arena := season_row.arena; opponent_division := season_row.division - 1; end if;
    select name into opponent_name from unnest(public.ai_club_names()) as name
    where name not in (select entry.team->>'name' from jsonb_array_elements(season_row.teams) as entry(team))
    order by random() limit 1;
    update career_ai_seasons
    set teams = teams || jsonb_build_array(jsonb_build_object('key', 'kv', 'name', opponent_name,
      'rating', least(99, public.ai_division_rating(opponent_arena, opponent_division) + 1), 'bonus', public.ai_arena_bonus(opponent_arena)))
    where id = target_season;
    insert into career_season_matches (ai_season_id, round, stage, home_user_id, away_ai_key)
    values (target_season, 11, 'playoff', season_row.user_id, 'kv');
    return;
  else
    next_outcome := case
      when user_position = 1 and season_row.division = 1 and season_row.arena >= 5 then 'champion'
      when user_position <= public.ai_direct_promotion_spots(season_row.arena, season_row.division) then 'promoted'
      when user_position >= 5 and season_row.division < 10 then 'relegated'
      else 'stayed' end;
  end if;

  update career_ai_seasons set status = 'completed', final_position = user_position, outcome = next_outcome, completed_at = now() where id = target_season;

  -- Bare opprykk gir premie: MB og én pakke som blir bedre jo høyere man rykker opp. Plasseringen gir ingenting.
  -- grant_season_budget er idempotent, så pakken gis bare første gang premien for sesongen deles ut.
  if next_outcome = 'promoted' and season_row.division > 1 then
    new_division := season_row.division - 1;
    if public.grant_season_budget(season_row.user_id, target_season, 'promotion_d' || new_division, floor(25 * (11 - new_division) * factor)::integer) then
      perform public.grant_pack(season_row.user_id, case when new_division >= 7 then 'gullpakke' when new_division >= 2 then 'premium_gull' else 'sjeldne_spillere' end, 1);
    end if;
  elsif next_outcome = 'promoted' then
    new_arena := season_row.arena + 1;
    if public.grant_season_budget(season_row.user_id, target_season, 'promotion_a' || new_arena, floor(25 * 11 * factor)::integer) then
      perform public.grant_pack(season_row.user_id, 'jumbo_premium_gull', 1);
    end if;
    insert into career_arena_unlocks (user_id, arena) values (season_row.user_id, new_arena) on conflict do nothing;
  end if;

  perform public.grant_club_xp(season_row.user_id, floor((50 + (10 - season_row.division) * 10) * factor)::integer);
  -- Neste sesong starter med en gang, så «Spill neste kamp» aldri står tom.
  perform public.ensure_ai_season(season_row.user_id);
end;
$fn$;

revoke all on function public.ensure_special_round() from public, anon, authenticated;
revoke all on function public.deliver_manager_pack(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.grant_pack(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.daily_packs_bought(uuid) from public, anon, authenticated;
revoke all on function public.finish_ai_season(uuid) from public, anon, authenticated;
grant execute on function public.ensure_special_round() to service_role;
grant execute on function public.deliver_manager_pack(uuid, text, boolean) to service_role;
grant execute on function public.grant_pack(uuid, text, integer) to service_role;
grant execute on function public.daily_packs_bought(uuid) to service_role;
grant execute on function public.finish_ai_season(uuid) to service_role;
