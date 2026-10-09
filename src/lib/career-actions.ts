"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, getT } from "@/i18n/server";
import { requireUser } from "./auth";
import { friendshipId } from "./friends";
import type { ActionState } from "./actions";
import { autoShotCell, getManagerKickoff, isAiTeam, keeperIsManager, MANAGER_KICKOFF_VERSION, MAX_SUBSTITUTIONS, getManagerShots, matchClock, NO_EXTENSION, planManagerTimeline, plannedDurationMs, playersById, resolveShot, SHOT_CHOICE_MS, shootingOf, shotKeeperRating, shotMinutesOf, matchExtension, squadAtSubWindow, SUB_WINDOW_MAX_MS, SUB_WINDOW_MINUTE, subReadySides, subWindowClosed, subWindowMs, type ManagerKickoffEvent, type ManagerMatchEvent, type MatchClock, type MatchSide, type ShotResult } from "./manager-match";
import { managerTeamSnapshots } from "./manager-snapshot";
import { supabaseAdmin } from "./supabase/server";

function profilePaths() { revalidatePath("/profile"); revalidatePath("/managerkarriere"); }

async function createManagerKickoff(db: ReturnType<typeof supabaseAdmin>, homeUserId: string, awayUserId: string): Promise<ManagerKickoffEvent | { error: string }> {
  const snapshots = await managerTeamSnapshots(db, [homeUserId, awayUserId]);
  if ("error" in snapshots) return snapshots;
  const home = snapshots.get(homeUserId); const away = snapshots.get(awayUserId);
  if (!home || !away) return { error: (await getT()).career.errors.bothNeedLineup };
  return { type: "kickoff", version: MANAGER_KICKOFF_VERSION, home, away };
}

export async function createCareerChallengeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const opponentId = String(formData.get("opponent_id") ?? "");
  if (!(await friendshipId(user.id, opponentId))) return { error: (await getT()).career.errors.onlyFriends };
  const { error } = await supabaseAdmin().from("career_challenges").insert({ challenger_id: user.id, opponent_id: opponentId, mode: "manager" });
  if (error) return { error: await dbErrorMessage(error) };
  profilePaths(); revalidatePath("/venner");
  return { ok: true };
}

export async function acceptCareerChallengeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const challengeId = String(formData.get("challenge_id") ?? ""); const db = supabaseAdmin();
  const { data: challenge } = await db.from("career_challenges").select("*").eq("id", challengeId).maybeSingle();
  if (!challenge || challenge.opponent_id !== user.id || challenge.status !== "pending" || new Date(challenge.expires_at) <= new Date()) return { error: (await getT()).career.errors.challengeUnavailable };
  if (challenge.mode === "manager") { const { data: lineup } = await db.from("manager_lineups").select("starters").eq("user_id", user.id).maybeSingle(); if (!lineup || lineup.starters.length !== 11) return { error: (await getT()).career.errors.pickLineupFirst }; }
  const { error } = await db.from("career_matches").insert({ challenge_id: challenge.id, mode: challenge.mode, home_user_id: challenge.challenger_id, away_user_id: challenge.opponent_id });
  if (error) return { error: await dbErrorMessage(error) };
  await db.from("career_challenges").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", challenge.id).eq("status", "pending");
  profilePaths(); return { ok: true };
}

export async function startCareerMatchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const matchId = String(formData.get("match_id") ?? ""); const db = supabaseAdmin();
  const { data: match } = await db.from("career_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || (match.home_user_id !== user.id && match.away_user_id !== user.id) || match.status !== "lobby") return { error: (await getT()).career.errors.cannotStart };
  const startedAt = new Date().toISOString();
  if (match.mode !== "manager") return { error: (await getT()).career.errors.cannotStart };
  const kickoff = await createManagerKickoff(db, match.home_user_id, match.away_user_id);
  if ("error" in kickoff) return { error: kickoff.error };
  const managerEvents = planManagerTimeline(match.id, [kickoff]);
  const { error } = await db.from("career_matches").update({ status: "live", started_at: startedAt, events: managerEvents }).eq("id", matchId).eq("status", "lobby");
  if (error) return { error: await dbErrorMessage(error) }; profilePaths(); return { ok: true };
}

export async function completeManagerMatchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const matchId = String(formData.get("match_id") ?? ""); const db = supabaseAdmin();
  const { data: match } = await db.from("career_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || match.mode !== "manager" || (match.home_user_id !== user.id && match.away_user_id !== user.id)) return { error: (await getT()).career.errors.matchNotFound };
  if (match.status === "completed") return { ok: true };
  // Kampen varer lenger når den har stoppet for straffer eller går til ekstraomganger, så lengden leses ut av selve planen.
  const events = Array.isArray(match.events) ? match.events : [];
  const { data: shotRows } = await db.from("career_match_shots").select("minute, kind, side, shooter_cell, keeper_cell, outcome").eq("match_id", matchId);
  const shots: ShotResult[] = (shotRows ?? []).map((shot) => ({ minute: shot.minute, kind: shot.kind, side: shot.side, shooterCell: shot.shooter_cell, keeperCell: shot.keeper_cell, outcome: shot.outcome }));
  const fullTime = plannedDurationMs(shotMinutesOf(events), matchExtension(events, shots), subWindowMs(events));
  if (match.status !== "live" || !match.started_at || Date.now() - new Date(match.started_at).getTime() < fullTime) return { error: (await getT()).career.errors.notFinished };
  const { data: settled, error } = await db.rpc("settle_finished_manager_matches", { target_match: matchId });
  if (error) return { error: await dbErrorMessage(error) };
  // 0 betyr at databasen ikke regnet kampen som ferdig (eller at motstanderen rakk det først).
  // Da må vi ikke svare «lagret» – klienten prøver igjen til statusen faktisk er fullført.
  if (!settled) {
    const { data: after } = await db.from("career_matches").select("status").eq("id", matchId).maybeSingle();
    if (after?.status !== "completed") return { error: (await getT()).career.errors.waitingForServer };
  }
  revalidatePath(`/managerkarriere/kamp/${matchId}`); profilePaths(); return { ok: true };
}

/** Felles oppslag for handlingene som skjer mens en managerkamp går. */
async function liveManagerMatch(matchId: string, userId: string) {
  const db = supabaseAdmin();
  const { data: match } = await db.from("career_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || match.mode !== "manager" || match.status !== "live" || !match.started_at) return { error: (await getT()).career.errors.notLive } as const;
  const events = Array.isArray(match.events) ? match.events : [];
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return { error: (await getT()).career.errors.lineupsMissing } as const;
  const side = kickoff.home.userId === userId ? "home" : kickoff.away.userId === userId ? "away" : null;
  if (!side) return { error: (await getT()).career.errors.notParticipant } as const;
  const elapsed = Date.now() - new Date(match.started_at).getTime();
  return { db, match, events, kickoff, side, elapsed, clock: matchClock(elapsed, shotMinutesOf(events), NO_EXTENSION, subWindowMs(events)) } as const;
}

/**
 * Markerer at `side` er ferdig i byttevinduet. Når alle managerne er ferdige (AI-klubber er det
 * alltid), lukkes vinduet, og hvor lenge det sto åpent lagres så klokka og oppgjøret kan gå videre.
 */
function markSubReady(events: ManagerMatchEvent[], kickoff: ManagerKickoffEvent, side: MatchSide, clock: MatchClock): ManagerMatchEvent[] {
  const ready = new Set([...subReadySides(events), side]);
  const next: ManagerMatchEvent[] = subReadySides(events).includes(side) ? events : [...events, { type: "sub_ready", side }];
  const everyoneDone = (["home", "away"] as const).every((entry) => isAiTeam(kickoff[entry]) || ready.has(entry));
  if (!everyoneDone || subWindowClosed(next)) return next;
  return [...next, { type: "sub_window_end", ms: Math.max(0, SUB_WINDOW_MAX_MS - clock.remainingMs) }];
}

type SubWindowStep = (live: Extract<Awaited<ReturnType<typeof liveManagerMatch>>, { db: unknown }>) => Promise<{ error: string } | { events: ManagerMatchEvent[] }>;

/**
 * Felles for alt som skjer i byttevinduet. Den nye planen skrives bare hvis ingen andre har endret
 * kampen siden vi leste den – ellers leses den på nytt og forsøket gjentas.
 */
async function inSubWindow(matchId: string, userId: string, step: SubWindowStep): Promise<ActionState> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const live = await liveManagerMatch(matchId, userId);
    if ("error" in live) return { error: live.error };
    const { db, events, kickoff, side, clock } = live;
    if (kickoff.version < 6 || clock.phase !== "substitutions" || clock.minute !== SUB_WINDOW_MINUTE || subWindowClosed(events) || subReadySides(events).includes(side)) {
      return { error: (await getT()).career.errors.subsOnlyInWindow };
    }
    const result = await step(live);
    if ("error" in result) return result;
    const { data: written, error } = await db.rpc("replace_live_manager_events", { target_match: matchId, expected_events: events, next_events: result.events });
    if (error) return { error: await dbErrorMessage(error) };
    if (written) {
      revalidatePath(`/managerkarriere/kamp/${matchId}`);
      return { ok: true };
    }
  }
  return { error: (await getT()).career.errors.matchBusy };
}

/** Ett bytte i vinduet på 70′. Det tredje byttet gjør deg samtidig ferdig. */
export async function makeManagerSubstitutionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const matchId = String(formData.get("match_id") ?? "");
  const outId = String(formData.get("out_id") ?? "");
  const inId = String(formData.get("in_id") ?? "");
  return inSubWindow(matchId, user.id, async ({ events, kickoff, side, clock }) => {
    const errors = (await getT()).career.errors;
    const squad = squadAtSubWindow(events, side);
    if (!squad || squad.used >= MAX_SUBSTITUTIONS) return { error: errors.subsUsed };
    if (!squad.starters.some((member) => member.player.id === outId) || !squad.bench.some((player) => player.id === inId)) return { error: errors.pickSubPlayers };
    // Byttet skjer på 70′, så det slår inn fra 71′ og kan aldri skrive om noe som alt er spilt.
    const planned = planManagerTimeline(matchId, [...events, { type: "substitution", side, outId, inId, minute: SUB_WINDOW_MINUTE }]);
    return { events: squad.used + 1 >= MAX_SUBSTITUTIONS ? markSubReady(planned, kickoff, side, clock) : planned };
  });
}

/** «Ferdig» i byttevinduet: hopp over resten av vinduet, eller vent på motstanderen hvis han ikke er ferdig. */
export async function finishSubWindowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const matchId = String(formData.get("match_id") ?? "");
  return inSubWindow(matchId, user.id, async ({ events, kickoff, side, clock }) => ({ events: markSubReady(events as ManagerMatchEvent[], kickoff, side, clock) }));
}

/**
 * Skytteren velger hjørne, og på straffe velger motstanderen hvor keeperen kaster seg.
 * Valget lagres i sin egen rad per rolle, så de to aldri skriver over hverandre.
 */
export async function chooseShotCellAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const matchId = String(formData.get("match_id") ?? "");
  const minute = Number(formData.get("minute"));
  const cell = Number(formData.get("cell"));
  if (!Number.isInteger(minute) || !Number.isInteger(cell)) return { error: (await getT()).career.errors.invalidChoice };
  const live = await liveManagerMatch(matchId, user.id);
  if ("error" in live) return { error: live.error };
  const { db, events, side, clock } = live;
  const shot = getManagerShots(events).find((entry) => entry.minute === minute);
  if (!shot) return { error: (await getT()).career.errors.chanceNotFound };
  if (clock.shotMinute !== minute) return { error: (await getT()).career.errors.chanceNotActive };
  if (clock.shotElapsedMs >= SHOT_CHOICE_MS) return { error: (await getT()).career.errors.timeUp };
  if (!shot.options.includes(cell)) return { error: (await getT()).career.errors.cannotAim };
  const role = shot.side === side ? "shooter" : "keeper";
  if (role === "keeper" && shot.kind !== "penalty") return { error: (await getT()).career.errors.keeperOnlyPenalty };
  const { error } = await db.rpc("record_shot_choice", { target_match: matchId, target_minute: minute, target_kind: shot.kind, target_side: shot.side, target_role: role, target_cell: cell });
  if (error) return { error: await dbErrorMessage(error) };
  revalidatePath(`/managerkarriere/kamp/${matchId}`);
  return { ok: true };
}

/**
 * Avgjør sjansen når velgetiden er over. Begge klientene kan kalle denne: utfallet regnes ut
 * likt hos begge, og oppdateringen gjelder bare så lenge raden fortsatt står uavgjort.
 */
export async function resolveShotAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const matchId = String(formData.get("match_id") ?? "");
  const minute = Number(formData.get("minute"));
  if (!Number.isInteger(minute)) return { error: (await getT()).career.errors.invalidChance };
  const live = await liveManagerMatch(matchId, user.id);
  if ("error" in live) return { error: live.error };
  const { db, events, kickoff, clock } = live;
  const shot = getManagerShots(events).find((entry) => entry.minute === minute);
  if (!shot) return { error: (await getT()).career.errors.chanceNotFound };
  const choiceOver = clock.shotMinute !== minute || clock.shotElapsedMs >= SHOT_CHOICE_MS;
  if (!choiceOver) return { error: (await getT()).career.errors.choiceNotOver };

  const { data: row } = await db.from("career_match_shots").select("shooter_cell, keeper_cell, outcome").eq("match_id", matchId).eq("minute", minute).maybeSingle();
  if (row?.outcome) return { ok: true };

  // Rakk man ikke å trykke, velges det for en – ellers ville en motstander som ikke fulgte med
  // gjort straffen til en gratis scoring.
  const shooterCell = row?.shooter_cell ?? autoShotCell(matchId, shot, "shooter");
  // Står en manager i mål på straffe, er det gjettelek mot ruta han valgte. Ellers trekkes
  // utfallet her på serveren, så ingen kan regne det ut på forhånd.
  const keeperPick = keeperIsManager(kickoff, shot) ? (row?.keeper_cell ?? autoShotCell(matchId, shot, "keeper")) : null;
  const players = playersById(events);
  const taker = players.get(shot.takerId);
  const { outcome, keeperCell } = resolveShot(shot, taker ? shootingOf(taker) : 70, shotKeeperRating(shot, players), shooterCell, keeperPick, Math.random(), Math.random());

  const { error } = await db
    .from("career_match_shots")
    .upsert({ match_id: matchId, minute, kind: shot.kind, side: shot.side, shooter_cell: shooterCell, keeper_cell: keeperCell, outcome, resolved_at: new Date().toISOString() }, { onConflict: "match_id,minute" })
    .is("outcome", null);
  if (error) return { error: await dbErrorMessage(error) };
  revalidatePath(`/managerkarriere/kamp/${matchId}`);
  return { ok: true };
}

