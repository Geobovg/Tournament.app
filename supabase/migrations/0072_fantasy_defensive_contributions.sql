-- Fantasy: defensive bidrag som i Premier League Fantasy 2025/26. Taklinger, blokkeringer og
-- brytninger i hver kamp, så spillervinduet kan vise dem. Poengene (+2 over grensen) regnes ut
-- i src/lib/fantasy/points.ts og ligger i points og breakdown som før. Kamper hentet før
-- denne migreringen har 0.
alter table football_fixture_players add column defensive_actions integer not null default 0;
