-- Klubblageret har ikke lenger noen grense (før: 80 kort). Pakker, kjøp og flytting sjekker
-- fortsatt manager_storage_capacity(), så funksjonen gir et tall som i praksis aldri nås i stedet
-- for å fjerne sjekkene. Tallet er lite nok til at free_squad + free_storage ikke flyter over.
-- Speiles i src/lib/manager-limits.ts, så de to må endres sammen.
create or replace function public.manager_storage_capacity() returns integer language sql immutable set search_path = public, pg_temp as $fn$ select 1000000 $fn$;
