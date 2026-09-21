-- Atomic manager purchases and lineup saves. Server actions authenticate users;
-- these functions still validate ownership and balance in one database transaction.
create or replace function public.buy_catalog_card(target_user uuid, target_catalog uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  profile_row player_profiles%rowtype;
  catalog_row player_catalog%rowtype;
  new_card_id uuid;
begin
  select * into profile_row from player_profiles where user_id = target_user for update;
  if not found then raise exception 'Fant ikke managerprofilen'; end if;
  select * into catalog_row from player_catalog where id = target_catalog and active for share;
  if not found then raise exception 'Kortet er ikke tilgjengelig'; end if;
  if profile_row.manager_budget < catalog_row.price then raise exception 'Ikke nok managerbudsjett'; end if;
  if (select count(*) from manager_cards where owner_id = target_user) >= 18 then raise exception 'Troppen er full (maks 18 spillere)'; end if;
  if exists (select 1 from manager_cards where owner_id = target_user and catalog_id = target_catalog) then raise exception 'Du eier allerede dette kortet'; end if;

  update player_profiles set manager_budget = manager_budget - catalog_row.price, updated_at = now() where user_id = target_user;
  insert into manager_cards (owner_id, catalog_id, name, position, overall, attributes, acquired_price)
  values (target_user, catalog_row.id, catalog_row.name, catalog_row.position, catalog_row.overall, catalog_row.attributes, catalog_row.price)
  returning id into new_card_id;
  return new_card_id;
end;
$$;

create or replace function public.save_manager_lineup(target_user uuid, next_formation text, next_starters uuid[], next_bench uuid[])
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  owned_count integer;
begin
  if next_formation not in ('4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '4-3-1-2') then raise exception 'Ugyldig formasjon'; end if;
  if coalesce(array_length(next_starters, 1), 0) <> 11 then raise exception 'Velg nøyaktig 11 startspillere'; end if;
  if coalesce(array_length(next_bench, 1), 0) > 7 then raise exception 'Du kan ha maksimalt 7 på benken'; end if;
  if cardinality(array(select distinct unnest(next_starters || next_bench))) <> cardinality(next_starters || next_bench) then raise exception 'En spiller kan bare velges én gang'; end if;
  select count(*) into owned_count from manager_cards where owner_id = target_user and id = any(next_starters || next_bench);
  if owned_count <> cardinality(next_starters || next_bench) then raise exception 'Troppen inneholder et kort du ikke eier'; end if;
  insert into manager_lineups (user_id, formation, starters, bench, updated_at)
  values (target_user, next_formation, next_starters, next_bench, now())
  on conflict (user_id) do update set formation = excluded.formation, starters = excluded.starters, bench = excluded.bench, updated_at = excluded.updated_at;
end;
$$;
