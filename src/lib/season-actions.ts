"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "./actions";
import { aiTeamSnapshot, type AiTeam } from "./ai-opponent";
import { requireUser } from "./auth";
import { friendshipId } from "./friends";
import { planManagerTimeline, type ManagerKickoffEvent } from "./manager-match";
import { managerTeamSnapshots } from "./manager-snapshot";
import { supabaseAdmin } from "./supabase/server";

type Db = ReturnType<typeof supabaseAdmin>;

function seasonPaths() { revalidatePath("/managerkarriere"); revalidatePath("/managerkarriere/sesong"); }

/**
 * Starter en sesongkamp direkte, uten lobby: kampen er allerede satt opp, så ingen trenger å utfordre
 * eller godta. Oppsettet låses til kampen med en betinget oppdatering, så to trykk ikke gir to kamper.
 */
async function kickOffFixture(db: Db, fixtureId: string, kickoff: ManagerKickoffEvent, row: { home_user_id: string; away_user_id: string | null; away_ai_name: string | null }): Promise<{ matchId: string } | { error: string }> {
  const matchId = crypto.randomUUID();
  const { error: insertError } = await db.from("career_matches").insert({ id: matchId, mode: "manager", status: "live", started_at: new Date().toISOString(), events: planManagerTimeline(matchId, [kickoff]), ...row });
  if (insertError) return { error: insertError.message };
  const { data: claimed, error: claimError } = await db.from("career_season_matches").update({ status: "live", match_id: matchId }).eq("id", fixtureId).eq("status", "scheduled").select("id");
  if (claimError || !claimed?.length) {
    await db.from("career_matches").delete().eq("id", matchId);
    const { data: fixture } = await db.from("career_season_matches").select("match_id").eq("id", fixtureId).maybeSingle();
    return fixture?.match_id ? { matchId: fixture.match_id } : { error: claimError?.message ?? "Kampen er allerede startet" };
  }
  return { matchId };
}

export async function playAiSeasonMatchAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const db = supabaseAdmin();
  const { data: seasonId, error: ensureError } = await db.rpc("ensure_ai_season", { target_user: user.id });
  if (ensureError) return { error: ensureError.message };
  const [{ data: season }, { data: fixtures }] = await Promise.all([
    db.from("career_ai_seasons").select("id, teams").eq("id", seasonId).single(),
    db.from("career_season_matches").select("id, round, status, match_id, home_user_id, home_ai_key, away_ai_key").eq("ai_season_id", seasonId).or(`home_user_id.eq.${user.id},away_user_id.eq.${user.id}`).in("status", ["scheduled", "live"]).order("round", { ascending: true }),
  ]);
  const live = (fixtures ?? []).find((fixture) => fixture.status === "live" && fixture.match_id);
  if (live) redirect(`/managerkarriere/kamp/${live.match_id}`);
  const next = (fixtures ?? []).find((fixture) => fixture.status === "scheduled");
  if (!season || !next) return { error: "Sesongen har ingen flere kamper" };
  const team = ((season.teams ?? []) as AiTeam[]).find((entry) => entry.key === (next.home_ai_key ?? next.away_ai_key));
  if (!team) return { error: "Fant ikke motstanderen" };
  const snapshots = await managerTeamSnapshots(db, [user.id]);
  if ("error" in snapshots) return { error: snapshots.error };
  const mine = snapshots.get(user.id);
  if (!mine) return { error: "Sett opp en ellever med 11 spillere i Tropp før du spiller" };
  // Du står alltid som hjemmelag i selve kampen. Hjemme og borte i sesongoppsettet gjelder bare tabellen.
  const result = await kickOffFixture(db, next.id, { type: "kickoff", version: 2, home: mine, away: aiTeamSnapshot(season.id, team) }, { home_user_id: user.id, away_user_id: null, away_ai_name: team.name });
  if ("error" in result) return { error: result.error };
  seasonPaths();
  redirect(`/managerkarriere/kamp/${result.matchId}`);
}

export async function playFriendSeasonMatchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const db = supabaseAdmin();
  const fixtureId = String(formData.get("fixture_id") ?? "");
  const { data: fixture } = await db.from("career_season_matches").select("id, friend_season_id, status, match_id, home_user_id, away_user_id").eq("id", fixtureId).maybeSingle();
  if (!fixture?.friend_season_id || (fixture.home_user_id !== user.id && fixture.away_user_id !== user.id)) return { error: "Fant ikke kampen" };
  if (fixture.status === "live" && fixture.match_id) redirect(`/managerkarriere/kamp/${fixture.match_id}`);
  if (fixture.status !== "scheduled" || !fixture.home_user_id || !fixture.away_user_id) return { error: "Kampen er allerede spilt" };
  const snapshots = await managerTeamSnapshots(db, [fixture.home_user_id, fixture.away_user_id]);
  if ("error" in snapshots) return { error: snapshots.error };
  const home = snapshots.get(fixture.home_user_id); const away = snapshots.get(fixture.away_user_id);
  if (!home || !away) return { error: "Begge managerne må ha en ellever med 11 spillere" };
  const result = await kickOffFixture(db, fixture.id, { type: "kickoff", version: 2, home, away }, { home_user_id: fixture.home_user_id, away_user_id: fixture.away_user_id, away_ai_name: null });
  if ("error" in result) return { error: result.error };
  seasonPaths();
  redirect(`/managerkarriere/kamp/${result.matchId}`);
}

export async function createFriendSeasonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const db = supabaseAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const invited = [...new Set(formData.getAll("friend_id").map(String))].filter((id) => id && id !== user.id);
  if (!name) return { error: "Gi sesongen et navn" };
  if (!invited.length) return { error: "Inviter minst én venn" };
  for (const friendId of invited) if (!(await friendshipId(user.id, friendId))) return { error: "Du kan bare invitere venner" };
  const { data: season, error } = await db.from("career_friend_seasons").insert({ name, created_by: user.id }).select("id").single();
  if (error) return { error: error.message };
  const { error: membersError } = await db.from("career_friend_season_members").insert([
    { season_id: season.id, user_id: user.id, status: "joined", joined_at: new Date().toISOString() },
    ...invited.map((friendId) => ({ season_id: season.id, user_id: friendId, status: "invited" })),
  ]);
  if (membersError) return { error: membersError.message };
  seasonPaths(); return { ok: true };
}

export async function respondFriendSeasonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const db = supabaseAdmin();
  const seasonId = String(formData.get("season_id") ?? "");
  const accept = formData.get("answer") === "join";
  const { data: season } = await db.from("career_friend_seasons").select("status").eq("id", seasonId).maybeSingle();
  if (season?.status !== "open") return { error: "Sesongen har allerede startet" };
  const query = accept
    ? db.from("career_friend_season_members").update({ status: "joined", joined_at: new Date().toISOString() }).eq("season_id", seasonId).eq("user_id", user.id).eq("status", "invited")
    : db.from("career_friend_season_members").delete().eq("season_id", seasonId).eq("user_id", user.id).eq("status", "invited");
  const { error } = await query;
  if (error) return { error: error.message };
  seasonPaths(); return { ok: true };
}

export async function startFriendSeasonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { error } = await supabaseAdmin().rpc("start_friend_season", { target_user: user.id, target_season: String(formData.get("season_id") ?? "") });
  if (error) return { error: error.message };
  seasonPaths(); return { ok: true };
}
