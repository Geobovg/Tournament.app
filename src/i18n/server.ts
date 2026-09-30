import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { sessionUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { translateDbError } from "./db-errors";
import { dictionaries, type Dictionary } from "./dictionaries";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "./locales";

// Språket lagret på profilen. Eget oppslag (ikke en del av currentUser) slik at innloggingen
// virker selv om kolonnen mangler, f.eks. før migreringen er kjørt.
export const profileLocale = cache(async (userId: string): Promise<Locale | null> => {
  const { data, error } = await supabaseAdmin().from("profiles").select("locale").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return isLocale(data.locale) ? data.locale : null;
});

// Rekkefølge: valget på profilen, så cookien fra språkknappen, ellers hovedspråket (engelsk).
export const getLocale = cache(async (): Promise<Locale> => {
  const userId = await sessionUserId();
  if (userId) {
    const saved = await profileLocale(userId);
    if (saved) return saved;
  }
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  return DEFAULT_LOCALE;
});

export async function getT(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}

// Feilmelding fra Supabase/Postgres oversatt til brukerens språk. stripPrefix fjerner alt fram
// til første kolon, slik noen actions har gjort med meldingene fra før.
export async function dbErrorMessage(error: { message: string }, options: { stripPrefix?: boolean } = {}): Promise<string> {
  const message = options.stripPrefix ? error.message.replace(/^.*?:\s*/, "") : error.message;
  return translateDbError(message, await getT());
}

// Ved innlogging: har profilen et lagret språk, følger cookien det. Hvis ikke lagres språket
// brukeren valgte med knappen på innloggingssiden, slik at valget følger kontoen videre.
export async function syncLocaleAfterLogin(userId: string) {
  const saved = await profileLocale(userId);
  const store = await cookies();
  if (saved) {
    store.set(LOCALE_COOKIE, saved, localeCookieOptions());
    return;
  }
  const cookie = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) await supabaseAdmin().from("profiles").update({ locale: cookie }).eq("id", userId);
}

export function localeCookieOptions() {
  return { path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: LOCALE_COOKIE_MAX_AGE };
}
