-- Starters are ordered by the formation slots. This makes a manual placement
-- persistent without duplicating the formation's fixed slot coordinates.
alter table public.player_catalog
  add column if not exists nationality text not null default 'International';

-- A match-ready team must have a complete seven-player bench.
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
  if coalesce(array_length(next_bench, 1), 0) <> 7 then raise exception 'Du må ha nøyaktig 7 på benken'; end if;
  if cardinality(array(select distinct unnest(next_starters || next_bench))) <> cardinality(next_starters || next_bench) then raise exception 'En spiller kan bare velges én gang'; end if;
  select count(*) into owned_count from manager_cards where owner_id = target_user and location = 'squad' and id = any(next_starters || next_bench);
  if owned_count <> cardinality(next_starters || next_bench) then raise exception 'Troppen inneholder et kort du ikke eier'; end if;
  insert into manager_lineups (user_id, formation, starters, bench, updated_at)
  values (target_user, next_formation, next_starters, next_bench, now())
  on conflict (user_id) do update set formation = excluded.formation, starters = excluded.starters, bench = excluded.bench, updated_at = excluded.updated_at;
end;
$$;
