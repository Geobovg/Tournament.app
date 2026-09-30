// Språkene appen kan vises på, i den rekkefølgen språkknappen viser dem.
// Nytt språk: legg det til her og lag en ordbok i src/i18n/<språk>/ typet mot den engelske.
export const LOCALES = ["en", "no", "sv", "da", "fi", "es", "de", "fr", "zh", "it", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

// Engelsk er hovedspråket. Alle som ikke har valgt noe selv, ser appen på engelsk.
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Språknavnene beholdes på sitt eget språk i menyen, uavhengig av hvilket språk appen viser.
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  en: "English",
  no: "Norsk",
  sv: "Svenska",
  da: "Dansk",
  fi: "Suomi",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  zh: "简体中文",
  it: "Italiano",
  ar: "العربية",
};

// Språkkoden Intl og toLocaleString bruker for datoer og tall.
export const INTL_LOCALES: Record<Locale, string> = {
  en: "en-GB",
  no: "nb-NO",
  sv: "sv-SE",
  da: "da-DK",
  fi: "fi-FI",
  es: "es-ES",
  de: "de-DE",
  fr: "fr-FR",
  zh: "zh-CN",
  it: "it-IT",
  ar: "ar",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
