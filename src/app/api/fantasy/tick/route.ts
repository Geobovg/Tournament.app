import { NextResponse } from "next/server";
import { runFantasyTick } from "@/lib/fantasy/tick";

// Kalles hvert andre minutt av Supabase (pg_cron + pg_net), se docs/fantasy-cron.md.
// Bare den som kjenner FANTASY_CRON_SECRET kan starte jobben.
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.FANTASY_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const forceFixtures = new URL(request.url).searchParams.get("fixtures") === "1";
  try {
    return NextResponse.json(await runFantasyTick({ forceFixtures }));
  } catch (error) {
    console.error("Fantasy-jobben feilet", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
