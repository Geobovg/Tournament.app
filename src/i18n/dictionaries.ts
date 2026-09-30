import { en, type Dictionary } from "./en";
import { no } from "./no";
import type { Locale } from "./locales";

export type { Dictionary };

// Begge ordbøkene er vanlige moduler, så de kan brukes både på serveren og i nettleseren.
// Tekst med tall eller navn i er funksjoner, f.eks. t.market.priceRange(10, 20).
export const dictionaries: Record<Locale, Dictionary> = { en, no };
