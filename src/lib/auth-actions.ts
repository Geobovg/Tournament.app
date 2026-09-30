"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearSession,
  currentUser,
  hashAccountCode,
  ipFingerprint,
  normalizeUsername,
  requireUser,
  setSession,
  validAccountCode,
  validUsername,
  verifyAccountCode,
} from "./auth";
import { dbErrorMessage, getT } from "@/i18n/server";
import { supabaseAdmin, supabasePublic } from "./supabase/server";

export type AuthActionState = { error?: string; ok?: boolean; message?: string };
export type PasskeySessionState = AuthActionState & { access_token?: string; refresh_token?: string };

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function siteUrl() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

// Gjelder bare kontoer som faktisk blir opprettet, så feiltastinger i skjemaet teller ikke.
const SIGNUPS_PER_IP_PER_HOUR = 20;

async function clientIp() {
  const requestHeaders = await headers();
  // Vercel setter x-forwarded-for; første adresse er klientens egen.
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip")?.trim() || null;
}

// Innlogging tar bare imot /join/-lenker som neste side, og registrering følger samme regel.
function safeNext(next: string) {
  return next.startsWith("/join/") ? next : "/";
}

// Supabase Auth krever en e-postadresse. Brukere registrerer seg bare med brukernavn og kode,
// så de får en intern adresse på et domene som aldri kan motta e-post (.invalid, RFC 2606).
function internalEmail() {
  return `${randomUUID()}@brukere.invalid`;
}

export async function registerAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = formValue(formData, "username");
  const usernameKey = normalizeUsername(username);
  const code = formValue(formData, "code");
  const confirmCode = formValue(formData, "confirm_code");
  const next = formValue(formData, "next");
  const t = (await getT()).auth.errors;

  if (!validUsername(username)) {
    return { error: t.invalidUsername };
  }
  if (!validAccountCode(code)) return { error: t.codeSixDigits };
  if (code !== confirmCode) return { error: t.codesDiffer };

  const db = supabaseAdmin();
  const ip = await clientIp();
  const ipHash = ip ? ipFingerprint(ip) : null;
  if (ipHash) {
    const { count } = await db
      .from("signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString());
    if ((count ?? 0) >= SIGNUPS_PER_IP_PER_HOUR) {
      return { error: t.tooManySignups };
    }
  }

  // Koden trenger ikke være unik, siden innlogging alltid krever brukernavnet også. Å si ifra om
  // at en kode er i bruk ville latt hvem som helst finne andres koder ved å prøve seg fram.
  const { data: existing } = await db.from("profiles").select("id").eq("username_key", usernameKey).maybeSingle();
  if (existing) return { error: t.usernameTaken };

  const email = internalEmail();
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password: code,
    email_confirm: true,
  });
  if (authError || !authData.user) return { error: authError ? await dbErrorMessage(authError) : t.createFailed };

  const { error: profileError } = await db.from("profiles").insert({
    id: authData.user.id,
    username,
    username_key: usernameKey,
    email,
    code_hash: hashAccountCode(code),
  });
  if (profileError) {
    await db.auth.admin.deleteUser(authData.user.id);
    return { error: t.saveFailed };
  }

  if (ipHash) {
    await db.from("signup_attempts").delete().lt("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString());
    await db.from("signup_attempts").insert({ ip_hash: ipHash });
  }

  await setSession(authData.user.id);
  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

export async function loginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const usernameKey = normalizeUsername(formValue(formData, "username"));
  const code = formValue(formData, "code");
  const next = formValue(formData, "next");
  const t = (await getT()).auth.errors;
  if (!usernameKey || !validAccountCode(code)) return { error: t.enterUsernameAndCode };

  const db = supabaseAdmin();
  const { data: profile } = await db
    .from("profiles")
    .select("id, email, code_hash, failed_attempts, lockout_count, locked_until")
    .eq("username_key", usernameKey)
    .maybeSingle();
  if (!profile) return { error: t.wrongUsernameOrCode };

  const now = Date.now();
  if (profile.locked_until && new Date(profile.locked_until).getTime() > now) {
    const minutes = Math.ceil((new Date(profile.locked_until).getTime() - now) / 60_000);
    return { error: t.tooManyAttemptsRetry(minutes) };
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
      return { error: t.tooManyAttemptsLocked(minutes) };
    }
    await db.from("profiles").update({ failed_attempts: attempts, updated_at: new Date().toISOString() }).eq("id", profile.id);
    return { error: valid ? t.confirmEmailFirst : t.wrongUsernameOrCode };
  }

  await db.from("profiles").update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }).eq("id", profile.id);
  await setSession(profile.id);
  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

/** Creates a short-lived Supabase Auth session so the browser can register a passkey. */
export async function passkeyRegistrationSessionAction(
  formData: FormData,
): Promise<PasskeySessionState> {
  const user = await requireUser();
  const code = formValue(formData, "code");
  const t = (await getT()).auth.errors;
  if (!validAccountCode(code)) return { error: t.enterYourCode };

  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("code_hash")
    .eq("id", user.id)
    .single();
  if (!profile || !verifyAccountCode(code, profile.code_hash)) return { error: t.wrongCode };

  const { data, error } = await supabasePublic().auth.signInWithPassword({
    email: user.email,
    password: code,
  });
  if (error || !data.session) return { error: t.passkeyPrepareFailed };
  return { ok: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}

export async function sendRecoveryAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formValue(formData, "email").toLowerCase();
  const t = (await getT()).auth;
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: t.errors.enterEmail };
  // Do not reveal whether the address is registered.
  await supabasePublic().auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/reset`,
  });
  return { ok: true, message: t.messages.recoverySent };
}

export async function changeCodeAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await currentUser();
  const t = (await getT()).auth;
  if (!user) return { error: t.errors.linkExpired };
  const code = formValue(formData, "code");
  const confirmCode = formValue(formData, "confirm_code");
  if (!validAccountCode(code)) return { error: t.errors.codeSixDigits };
  if (code !== confirmCode) return { error: t.errors.codesDiffer };

  const db = supabaseAdmin();
  const { error } = await db.auth.admin.updateUserById(user.id, { password: code });
  if (error) return { error: await dbErrorMessage(error) };
  await db.from("profiles").update({
    code_hash: hashAccountCode(code),
    failed_attempts: 0,
    lockout_count: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);
  return { ok: true, message: t.messages.codeChanged };
}

export async function updateProfileAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await requireUser();
  const username = formValue(formData, "username");
  const usernameKey = normalizeUsername(username);
  const currentCode = formValue(formData, "current_code");
  const t = (await getT()).profile;
  if (!validUsername(username)) return { error: t.errors.invalidUsername };
  if (!verifyAccountCode(currentCode, (await supabaseAdmin().from("profiles").select("code_hash").eq("id", user.id).single()).data?.code_hash ?? "")) {
    return { error: t.errors.wrongCodeForUsername };
  }
  const { error } = await supabaseAdmin().from("profiles").update({ username, username_key: usernameKey, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) return { error: t.errors.usernameTaken };
  revalidatePath("/", "layout");
  return { ok: true, message: t.messages.usernameUpdated };
}

export async function uploadAvatarAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await requireUser();
  const file = formData.get("avatar");
  const t = (await getT()).profile;
  if (!(file instanceof File) || file.size === 0) return { error: t.errors.chooseImage };
  // Bare vanlige bildeformater. SVG kan inneholde kode som kjører når andre ser bildet.
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension || file.size > 2 * 1024 * 1024) return { error: t.errors.imageFormat };
  const path = `${user.id}/${randomUUID()}.${extension}`;
  const db = supabaseAdmin();
  const upload = await db.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) return { error: await dbErrorMessage(upload.error) };
  const { data } = db.storage.from("avatars").getPublicUrl(path);
  await db.from("profiles").update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/", "layout");
  return { ok: true, message: t.messages.avatarUpdated };
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
  const t = (await getT()).profile;
  const { data: profile } = await db.from("profiles").select("code_hash").eq("id", user.id).maybeSingle();
  if (!profile || !verifyAccountCode(code, profile.code_hash)) return { error: t.errors.wrongCodeForDelete };
  const { data: active } = await db.from("tournaments").select("id").eq("owner_id", user.id).neq("status", "completed").limit(1);
  if (active && active.length > 0) return { error: t.errors.activeTournaments };
  await db.storage.from("avatars").remove([`${user.id}`]);
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return { error: await dbErrorMessage(error) };
  await clearSession();
  redirect("/register");
}
