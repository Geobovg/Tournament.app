"use client";

import { useTransition } from "react";
import { useLocale, useT } from "@/i18n/client";
import { LOCALE_SHORT, LOCALES } from "@/i18n/locales";
import { setLocaleAction } from "@/lib/locale-actions";

// compact viser bare kortnavnene (ENG / NOR), til toppmenyen.
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const current = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <div role="group" aria-label={t.common.chooseLanguage} className="inline-flex rounded-lg border border-border p-0.5 text-sm">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          disabled={pending}
          onClick={() => startTransition(() => setLocaleAction(locale))}
          className={`rounded-md px-3 py-1 font-medium ${locale === current ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground"}`}
        >
          {compact ? LOCALE_SHORT[locale] : t.common.languageNames[locale]}
        </button>
      ))}
    </div>
  );
}
