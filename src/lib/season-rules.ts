// Opprykk og nedrykk i AI-sesongen. Speiler SQL-funksjonene i migrering 0062.

import { lastArena } from "./arenas";

/** Antall plasser som gir direkte opprykk: topp 2 i divisjon 10–7, bare vinneren i 6–1. Vinneren av divisjon 1 går til neste arena. */
export function directPromotionSpots(division: number) {
  return division >= 7 ? 2 : 1;
}

/** Plassen som gir opprykkskvalik, rett under opprykksplassene. Det er ingen kvalik over divisjon 1 i siste arena. */
export function playoffPosition(division: number, arena = 1) {
  return division === 1 && arena >= lastArena ? null : directPromotionSpots(division) + 1;
}

/** De to nederste rykker ned, men ikke fra divisjon 10, som er gulvet i hver arena. */
export function isRelegation(position: number, division: number) {
  return division < 10 && position >= 5;
}
