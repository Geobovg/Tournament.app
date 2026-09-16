import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { access_token?: string; next?: string } | null;
  const accessToken = body?.access_token;
  if (!accessToken) return NextResponse.json({ error: "Mangler passkey-token" }, { status: 400 });

  const { data, error } = await supabaseAdmin().auth.getUser(accessToken);
  if (error || !data.user?.email_confirmed_at) return NextResponse.json({ error: "Passkey-innlogging mislyktes" }, { status: 401 });
  const { data: profile } = await supabaseAdmin().from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Fant ikke brukerprofilen" }, { status: 401 });

  await setSession(data.user.id);
  const next = typeof body?.next === "string" && body.next.startsWith("/") ? body.next : "/";
  return NextResponse.json({ ok: true, next });
}
