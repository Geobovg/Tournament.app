-- SBC: kort fra benken og reservene kan leveres, bare startelleveren er sperret.
-- Et benkekort som leveres, forsvinner fra benken, og plassen står tom til manageren fyller den.
create or replace function public.complete_sbc(target_user uuid, target_sbc text, target_cards uuid[])
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  sbc_row sbc_challenges%rowtype;
  week_start timestamptz := (public.sbc_week_bounds()->>'week_start')::timestamptz;
  usable integer;
  req jsonb;
  completion_id uuid;
begin
  select * into sbc_row from sbc_challenges where key = target_sbc and active;
  if not found then raise exception 'Fant ikke denne SBC-en'; end if;
  -- Profilen låses, så to samtidige leveringer ikke kan snike seg forbi ukegrensen.
  perform 1 from player_profiles where user_id = target_user for update;
  if not found then raise exception 'Fant ikke managerprofilen'; end if;

  if sbc_row.weekly_limit is not null
    and (select count(*) from sbc_completions where user_id = target_user and sbc_key = target_sbc and completed_at >= week_start) >= sbc_row.weekly_limit then
    raise exception 'Du har ikke flere forsøk igjen på denne SBC-en denne uken';
  end if;

  if target_cards is null or cardinality(target_cards) <> sbc_row.card_count
    or (select count(distinct picked) from unnest(target_cards) picked) <> sbc_row.card_count then
    raise exception 'Velg riktig antall kort til SBC-en';
  end if;

  -- Bare egne kort som ikke er Academy, ikke står i startelleveren og ikke ligger ute på markedet.
  -- Benk og reserver kan leveres.
  select count(*) into usable
  from manager_cards card
  where card.id = any(target_cards) and card.owner_id = target_user and card.tradable and not card.is_starter
    and not exists (select 1 from market_listings listing where listing.card_id = card.id and listing.status = 'active')
    and not exists (select 1 from manager_lineups lineup where lineup.user_id = target_user and card.id = any(lineup.starters));
  if usable <> sbc_row.card_count then raise exception 'Noen av kortene kan ikke brukes i en SBC'; end if;

  for req in select value from jsonb_array_elements(sbc_row.requirements) loop
    if not public.sbc_requirement_met(req, target_cards) then raise exception 'Kortene oppfyller ikke kravene til SBC-en'; end if;
  end loop;

  -- Kort fra benken tas ut av laget. Plassen står tom til manageren fyller den selv.
  update manager_lineups
  set bench = array(select kept from unnest(bench) with ordinality as b(kept, ord) where kept <> all(target_cards) order by ord), updated_at = now()
  where user_id = target_user and bench && target_cards;
  delete from manager_cards where id = any(target_cards);
  insert into sbc_completions (user_id, sbc_key) values (target_user, target_sbc) returning id into completion_id;

  if sbc_row.reward_mb > 0 then
    insert into career_reward_events (user_id, source_type, source_id, reward_key, manager_budget)
    values (target_user, 'sbc', completion_id, 'reward', sbc_row.reward_mb);
    update player_profiles
    set manager_budget = manager_budget + sbc_row.reward_mb, manager_budget_earned = manager_budget_earned + sbc_row.reward_mb, updated_at = now()
    where user_id = target_user;
  end if;
  if sbc_row.reward_pack is not null then
    insert into manager_pack_inventory (user_id, pack_key, quantity) values (target_user, sbc_row.reward_pack, 1)
    on conflict (user_id, pack_key) do update set quantity = manager_pack_inventory.quantity + 1, updated_at = now();
  end if;

  return jsonb_build_object('reward_mb', sbc_row.reward_mb, 'reward_pack', sbc_row.reward_pack);
end;
$fn$;

revoke all on function public.complete_sbc(uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function public.complete_sbc(uuid, text, uuid[]) to service_role;
