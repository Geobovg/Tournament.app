"use client";

import { createClient } from "@supabase/supabase-js";
import type { Dictionary } from "@/i18n/dictionaries";

let client: ReturnType<typeof createClient> | undefined;

/** Browser client used only for WebAuthn/passkey ceremonies. */
export function supabaseBrowser(t: Dictionary) {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error(t.auth.passkey.notConfigured);
    client = createClient(url, key, {
      auth: {
        experimental: { passkey: true },
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
