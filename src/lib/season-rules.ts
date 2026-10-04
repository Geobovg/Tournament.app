// Opprykk og nedrykk i AI-sesongen. Speiler SQL-funksjonene i migrasjon 0052.

/** Antall plasser som gir direkte opprykk: topp 2 i divisjon 10–7, bare vinneren i 6–2, ingen i divisjon 1. */
export function directPromotionSpots(division: number) {
  return division === 1 ? 0 : division >= 7 ? 2 : 1;
}

/** Plassen som gir opprykkskvalik mot en klubb fra divisjonen over, rett under opprykksplassene. */
export function playoffPosition(division: number) {
  return division === 1 ? null : directPromotionSpots(division) + 1;
}

/** De to nederste rykker ned, men ikke fra divisjon 10. */
export function isRelegation(position: number, division: number) {
  return division < 10 && position >= 5;
}
