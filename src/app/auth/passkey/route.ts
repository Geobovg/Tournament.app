import { NextRequest, NextResponse } from "next/server";
import { getT } from "@/i18n/server";
import { setSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { access_token?: string; next?: string } | null;
  const accessToken = body?.access_token;
  const t = (await getT()).auth.passkey;
  if (!accessToken) return NextResponse.json({ error: t.missingToken }, { status: 400 });

  const { data, error } = await supabaseAdmin().auth.getUser(accessToken);
  if (error || !data.user?.email_confirmed_at) return NextResponse.json({ error: t.routeLoginFailed }, { status: 401 });
  const { data: profile } = await supabaseAdmin().from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: t.profileNotFound }, { status: 401 });

  await setSession(data.user.id);
  // Samme regel som safeNext i auth-actions.ts. Bare «/» ville sluppet gjennom «//annen-side.no».
  const next = typeof body?.next === "string" && body.next.startsWith("/join/") ? body.next : "/";
  return NextResponse.json({ ok: true, next });
}
