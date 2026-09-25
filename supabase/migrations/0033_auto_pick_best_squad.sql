-- «Velg beste tropp» henter nå fra hele klubben, ikke bare fra kortene som
-- allerede står i troppen. Hele omrokeringen må skje i ett kall: gjorde vi det
-- med move/swap ett kort om gangen, ville troppen stå over kapasitet mellom to
-- kall, og et avbrudd midtveis ville etterlatt klubben halvveis omstokket.
create or replace function public.auto_pick_manager_squad(
  target_user uuid,
  next_formation text,
  next_squad uuid[],
  next_starters uuid[],
  next_bench uuid[]
)
returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  squad_size integer;
  owned_count integer;
  total_cards integer;
begin
  squad_size := coalesce(cardinality(next_squad), 0);
  if squad_size > public.manager_squad_capacity() then
    raise exception 'Troppen tar maks % kort', public.manager_squad_capacity();
  end if;
  if cardinality(array(select distinct unnest(next_squad))) <> squad_size then
    raise exception 'En spiller kan bare velges én gang';
  end if;
  -- Elleveren og benken må ligge i troppen, ellers avviser save_manager_lineup
  -- dem etterpå og vi sitter igjen med flyttede kort uten ny ellever.
  if exists (select 1 from unnest(next_starters || next_bench) as card_id where card_id <> all(next_squad)) then
    raise exception 'Elleveren og benken må ligge i troppen';
  end if;

  select count(*) into owned_count from manager_cards where owner_id = target_user and id = any(next_squad);
  if owned_count <> squad_size then raise exception 'Troppen inneholder et kort du ikke eier'; end if;

  select count(*) into total_cards from manager_cards where owner_id = target_user;
  if total_cards - squad_size > public.manager_storage_capacity() then
    raise exception 'Lageret er fullt (maks % kort)', public.manager_storage_capacity();
  end if;

  update manager_cards
  set location = case when id = any(next_squad) then 'squad' else 'storage' end
  where owner_id = target_user
    and location is distinct from (case when id = any(next_squad) then 'squad' else 'storage' end);

  -- Kortene har allerede fått ny plassering i denne transaksjonen, så
  -- save_manager_lineup ser den nye troppen når den sjekker eierskapet.
  perform public.save_manager_lineup(target_user, next_formation, next_starters, next_bench);
end;
$fn$;
