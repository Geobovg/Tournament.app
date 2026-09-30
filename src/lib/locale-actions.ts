"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { localeCookieOptions } from "@/i18n/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/locales";
import { sessionUserId } from "./auth";
import { supabaseAdmin } from "./supabase/server";

// Språket lagres i en cookie (virker før innlogging) og på profilen (følger kontoen til andre enheter).
export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, localeCookieOptions());
  const userId = await sessionUserId();
  if (userId) await supabaseAdmin().from("profiles").update({ locale, updated_at: new Date().toISOString() }).eq("id", userId);
  revalidatePath("/", "layout");
}
