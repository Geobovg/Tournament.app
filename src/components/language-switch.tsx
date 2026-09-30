"use client";

import { useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { LOCALE_NATIVE_NAMES, LOCALES } from "@/i18n/locales";
import { setLocaleAction } from "@/lib/locale-actions";

export function LanguageSwitch() {
  const current = useLocale();
  const [pending, startTransition] = useTransition();
  return (
    <details className="relative text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-medium text-muted transition hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true">🌐</span>
        <span>Language</span>
        <span aria-hidden="true" className="text-xs">⌄</span>
      </summary>
      <div role="menu" aria-label="Language" className="absolute right-0 z-50 mt-2 grid min-w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            role="menuitemradio"
            lang={locale}
            dir={locale === "ar" ? "rtl" : "ltr"}
            aria-checked={locale === current}
            disabled={pending}
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              startTransition(() => setLocaleAction(locale));
            }}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-left font-medium ${locale === current ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-raised hover:text-foreground"}`}
          >
            {LOCALE_NATIVE_NAMES[locale]}
            {locale === current ? <span aria-label="Selected">✓</span> : null}
          </button>
        ))}
      </div>
    </details>
  );
}
