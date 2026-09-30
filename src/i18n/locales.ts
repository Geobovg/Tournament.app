// Språkene appen kan vises på, i den rekkefølgen språkknappen viser dem.
// Nytt språk: legg det til her og lag en ordbok i src/i18n/<språk>/ typet mot den engelske.
export const LOCALES = ["en", "no"] as const;
export type Locale = (typeof LOCALES)[number];

// Engelsk er hovedspråket. Alle som ikke har valgt noe selv, ser appen på engelsk.
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Kortnavnet i den lille språkknappen øverst.
export const LOCALE_SHORT: Record<Locale, string> = { en: "ENG", no: "NOR" };

// Språkkoden Intl og toLocaleString bruker for datoer og tall.
export const INTL_LOCALES: Record<Locale, string> = { en: "en-GB", no: "nb-NO" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
