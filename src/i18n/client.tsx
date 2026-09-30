"use client";

import { createContext, useContext, type ReactNode } from "react";
import { dictionaries, type Dictionary } from "./dictionaries";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

// Settes i rotlayouten, så alle klientkomponenter vet hvilket språk som er valgt.
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Dictionary {
  return dictionaries[useLocale()];
}
