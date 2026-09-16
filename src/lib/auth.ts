import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase/server";

const SESSION_COOKIE = "tournament_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type AppUser = {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
};

function secret() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Mangler SUPABASE_SERVICE_ROLE_KEY");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("nb-NO");
}

export function validUsername(value: string) {
  return /^[a-zA-Z0-9_.-]{3,24}$/.test(value);
}

export function validAccountCode(value: string) {
  return /^\d{6}$/.test(value);
}

export function hashAccountCode(value: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(value, salt, 32);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyAccountCode(value: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(value, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(derived, expected);
}

/** Allows a global uniqueness constraint without storing the six digits themselves. */
export function accountCodeFingerprint(value: string) {
  return createHmac("sha256", secret()).update(`account-code:${value}`).digest("hex");
}

export async function setSession(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const value = `${userId}.${expiresAt}`;
  const store = await cookies();
  store.set(SESSION_COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<AppUser | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [id, expiry, signature] = raw.split(".");
  const value = `${id}.${expiry}`;
  if (!id || !expiry || !signature || signature !== sign(value)) return null;
  if (Number(expiry) < Math.floor(Date.now() / 1000)) return null;

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, username, email, avatar_url")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AppUser;
}

export async function requireUser(): Promise<AppUser> {
  const user = await currentUser();
  if (!user) throw new Error("Du må logge inn først");
  return user;
}
