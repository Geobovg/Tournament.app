-- Brattere klubbnivå: hvert nivå koster 50 XP mer enn det forrige (100, 150, 200, 250 …).
-- Nivå 10 krever dermed 2700 XP i stedet for 900. Nivået regnes alltid ut fra XP, så
-- eksisterende spillere får nivået regnet på nytt – noen går ned. Belønninger for nivåer de
-- alt har nådd, beholder de, og unik-nøkkelen i grant_club_xp hindrer at de betales ut igjen.
-- Kurven speiles i src/lib/club-level.ts, så de to må endres sammen.
create or replace function public.club_level_for_xp(xp integer)
returns integer
language plpgsql
immutable
set search_path = public, pg_temp
as $fn$
declare
  reached integer := 1;
begin
  -- XP som trengs for å nå nivå n: 100·(n−1) + 25·(n−1)·(n−2).
  while 100 * reached + 25 * reached * (reached - 1) <= xp loop
    reached := reached + 1;
  end loop;
  return reached;
end;
$fn$;

revoke all on function public.club_level_for_xp(integer) from public, anon, authenticated;
