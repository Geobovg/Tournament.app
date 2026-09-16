"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  accountCodeFingerprint,
  clearSession,
  currentUser,
  hashAccountCode,
  normalizeUsername,
  requireUser,
  setSession,
  validAccountCode,
  validUsername,
  verifyAccountCode,
} from "./auth";
import { supabaseAdmin, supabasePublic } from "./supabase/server";

export type AuthActionState = { error?: string; ok?: boolean; message?: string };

export async function isAccountCodeAvailable(code: string, ignoreUserId?: string) {
  if (!validAccountCode(code)) return false;
  const sessionUser = await currentUser();
  const excludedId = ignoreUserId ?? sessionUser?.id;
  const query = supabaseAdmin().from("profiles").select("id").eq("code_fingerprint", accountCodeFingerprint(code));
  const { data } = excludedId ? await query.neq("id", excludedId).maybeSingle() : await query.maybeSingle();
  return !data;
}

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function siteUrl() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function registerAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = formValue(formData, "username");
  const usernameKey = normalizeUsername(username);
  const email = formValue(formData, "email").toLowerCase();
  const code = formValue(formData, "code");
  const confirmCode = formValue(formData, "confirm_code");

  if (!validUsername(username)) {
    return { error: "Brukernavn må ha 3–24 tegn og bare bokstaver, tall, punktum, bindestrek eller understrek" };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Skriv inn en gyldig e-postadresse" };
  if (!validAccountCode(code)) return { error: "Koden må være nøyaktig 6 sifre" };
  if (code !== confirmCode) return { error: "Kodene er ikke like" };

  const db = supabaseAdmin();
  const fingerprint = accountCodeFingerprint(code);
  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .or(`username_key.eq.${usernameKey},code_fingerprint.eq.${fingerprint},email.eq.${email}`)
    .limit(1);
  if (existing && existing.length > 0) {
    return { error: "Brukernavnet, e-posten eller den sekssifrede koden er allerede i bruk" };
  }

  const { data: authData, error: authError } = await supabasePublic().auth.signUp({
    email,
    password: code,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback` },
  });
  if (authError || !authData.user) return { error: authError?.message ?? "Kunne ikke opprette kontoen" };

  const { error: profileError } = await db.from("profiles").insert({
    id: authData.user.id,
    username,
    username_key: usernameKey,
    email,
    code_hash: hashAccountCode(code),
    code_fingerprint: fingerprint,
  });
  if (profileError) {
    await db.auth.admin.deleteUser(authData.user.id);
    return { error: "Kunne ikke lagre kontoen. Prøv en annen kode eller et annet brukernavn." };
  }

  return { ok: true, message: "Sjekk e-posten din og trykk på bekreftelseslenken for å aktivere kontoen." };
}

export async function loginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const usernameKey = normalizeUsername(formValue(formData, "username"));
  const code = formValue(formData, "code");
  const next = formValue(formData, "next");
  if (!usernameKey || !validAccountCode(code)) return { error: "Skriv inn brukernavn og sekssifret kode" };

  const db = supabaseAdmin();
  const { data: profile } = await db
    .from("profiles")
    .select("id, email, code_hash, failed_attempts, lockout_count, locked_until")
    .eq("username_key", usernameKey)
    .maybeSingle();
  if (!profile) return { error: "Feil brukernavn eller kode" };

  const now = Date.now();
  if (profile.locked_until && new Date(profile.locked_until).getTime() > now) {
    const minutes = Math.ceil((new Date(profile.locked_until).getTime() - now) / 60_000);
    return { error: `For mange forsøk. Prøv igjen om ${minutes} minutt${minutes === 1 ? "" : "er"}, eller bruk «Glemt kode?».` };
  }

  const valid = verifyAccountCode(code, profile.code_hash);
  const authResult = valid
    ? await supabasePublic().auth.signInWithPassword({ email: profile.email, password: code })
    : { error: new Error("invalid") };

  if (!valid || authResult.error || !authResult.data.user?.email_confirmed_at) {
    const attempts = profile.failed_attempts + 1;
    if (attempts >= 5) {
      const minutes = profile.lockout_count === 0 ? 5 : 15;
      await db.from("profiles").update({
        failed_attempts: 0,
        lockout_count: profile.lockout_count + 1,
        locked_until: new Date(now + minutes * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", profile.id);
      return { error: `For mange forsøk. Kontoen er låst i ${minutes} minutter.` };
    }
    await db.from("profiles").update({ failed_attempts: attempts, updated_at: new Date().toISOString() }).eq("id", profile.id);
    return { error: valid ? "Bekreft e-posten før du logger inn" : "Feil brukernavn eller kode" };
  }

  await db.from("profiles").update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }).eq("id", profile.id);
  await setSession(profile.id);
  revalidatePath("/", "layout");
  redirect(next.startsWith("/join/") ? next : "/");
}

export async function sendRecoveryAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formValue(formData, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Skriv inn e-postadressen din" };
  // Do not reveal whether the address is registered.
  await supabasePublic().auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/reset`,
  });
  return { ok: true, message: "Hvis e-posten er registrert, får du straks en lenke for å endre koden. Lenken er gyldig i 30 minutter." };
}

export async function changeCodeAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await currentUser();
  if (!user) return { error: "Lenken er utløpt. Be om en ny e-post for å endre kode." };
  const code = formValue(formData, "code");
  const confirmCode = formValue(formData, "confirm_code");
  if (!validAccountCode(code)) return { error: "Koden må være nøyaktig 6 sifre" };
  if (code !== confirmCode) return { error: "Kodene er ikke like" };

  const db = supabaseAdmin();
  const fingerprint = accountCodeFingerprint(code);
  const { data: duplicate } = await db.from("profiles").select("id").eq("code_fingerprint", fingerprint).neq("id", user.id).maybeSingle();
  if (duplicate) return { error: "Denne koden er allerede i bruk av en annen konto" };

  const { error } = await db.auth.admin.updateUserById(user.id, { password: code });
  if (error) return { error: error.message };
  await db.from("profiles").update({
    code_hash: hashAccountCode(code),
    code_fingerprint: fingerprint,
    failed_attempts: 0,
    lockout_count: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);
  return { ok: true, message: "Koden er endret. Du kan nå logge inn med den nye koden." };
}

export async function updateProfileAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await requireUser();
  const username = formValue(formData, "username");
  const usernameKey = normalizeUsername(username);
  const currentCode = formValue(formData, "current_code");
  if (!validUsername(username)) return { error: "Ugyldig brukernavn" };
  if (!verifyAccountCode(currentCode, (await supabaseAdmin().from("profiles").select("code_hash").eq("id", user.id).single()).data?.code_hash ?? "")) {
    return { error: "Skriv inn riktig sekssifret kode for å endre brukernavn" };
  }
  const { error } = await supabaseAdmin().from("profiles").update({ username, username_key: usernameKey, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) return { error: "Brukernavnet er allerede i bruk" };
  revalidatePath("/", "layout");
  return { ok: true, message: "Brukernavnet er oppdatert" };
}

export async function uploadAvatarAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Velg et bilde først" };
  if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) return { error: "Bildet må være et bilde på maksimalt 2 MB" };
  const extension = file.type === "image/png" ? "png" : "jpg";
  const path = `${user.id}/${randomUUID()}.${extension}`;
  const db = supabaseAdmin();
  const upload = await db.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) return { error: upload.error.message };
  const { data } = db.storage.from("avatars").getPublicUrl(path);
  await db.from("profiles").update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/", "layout");
  return { ok: true, message: "Profilbildet er oppdatert" };
}

export async function logoutAction() {
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function deleteAccountAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await requireUser();
  const code = formValue(formData, "code");
  const db = supabaseAdmin();
  const { data: profile } = await db.from("profiles").select("code_hash").eq("id", user.id).maybeSingle();
  if (!profile || !verifyAccountCode(code, profile.code_hash)) return { error: "Skriv inn riktig sekssifret kode for å slette kontoen" };
  const { data: active } = await db.from("tournaments").select("id").eq("owner_id", user.id).neq("status", "completed").limit(1);
  if (active && active.length > 0) return { error: "Lukk, slett eller overfør de aktive turneringene dine før du sletter kontoen" };
  await db.storage.from("avatars").remove([`${user.id}`]);
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };
  await clearSession();
  redirect("/register");
}
