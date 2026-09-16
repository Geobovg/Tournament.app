import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { supabasePublic } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { data } = await supabasePublic().auth.exchangeCodeForSession(code);
    if (data.user) await setSession(data.user.id);
  }
  return NextResponse.redirect(new URL("/", request.url));
}
