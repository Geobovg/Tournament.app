"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbErrorMessage, getT } from "@/i18n/server";
import type { ActionState } from "../actions";
import { requireUser } from "../auth";
import { friendshipId } from "../friends";
import { supabaseAdmin } from "../supabase/server";
import { getFiveState, listFivePeople, type FivePerson, type FiveState } from "./data";
import { fiveCardStats, seededRoll, simulateFiveMatch, type FivePlayer, type FiveTeam } from "./match";
import { FIVE_AI_LEVELS, FIVE_BENCH, FIVE_REWARDED_AI_MATCHES_PER_DAY, FIVE_REWARDED_FRIEND_MATCHES_PER_DAY, fiveAiRating, fiveAiReward, fiveFriendReward, fivePacks, isFiveFormation } from "./rules";

export async function startFiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const picked = formData.getAll("person_id").map(String).filter(Boolean);
  const { error } = await supabaseAdmin().rpc("start_five_career", { target_user: user.id, picked });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/femmer");
  return { ok: true };
}

export async function saveFiveLineupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const formation = String(formData.get("formation") ?? "");
  const starters = formData.getAll("starter_ids").map(String).filter(Boolean);
  const bench = formData.getAll("bench_ids").map(String).filter(Boolean);
  if (!isFiveFormation(formation)) return { error: (await getT()).femmer.errors.invalidFormation };
  const { error } = await supabaseAdmin().rpc("save_five_lineup", { target_user: user.id, next_formation: formation, next_starters: starters, next_bench: bench });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/femmer");
  return { ok: true };
}

export type FivePull = { cardId: string; personId: string; overall: number; upgrade: boolean };
export type FivePackState = ActionState & { pulls?: FivePull[]; openedAt?: number };

export async function openFivePackAction(_prev: FivePackState, formData: FormData): Promise<FivePackState> {
  const user = await requireUser();
  const pack = fivePacks.find((entry) => entry.key === formData.get("pack_key"));
  if (!pack) return { error: (await getT()).femmer.errors.invalidPack };
  const { data, error } = await supabaseAdmin().rpc("open_five_pack", { target_user: user.id, card_count: pack.cards, pack_price: pack.price });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/femmer");
  const pulls = ((data ?? []) as { card_id: string; person_id: string; overall: number; upgrade: boolean }[]).map((pull) => ({ cardId: pull.card_id, personId: pull.person_id, overall: pull.overall, upgrade: pull.upgrade }));
  return { ok: true, pulls, openedAt: Date.now() };
}

function teamFromState(state: FiveState, name: string, userId: string): FiveTeam | null {
  const byId = new Map(state.cards.map((card) => [card.id, card]));
  const player = (id: string): FivePlayer | null => {
    const card = byId.get(id);
    return card ? { id: card.id, personId: card.personId, name: card.name, slug: card.slug, overall: card.overall } : null;
  };
  const starters = state.starters.map(player).filter((entry): entry is FivePlayer => Boolean(entry));
  if (starters.length !== 5) return null;
  return { name, formation: state.profile.formation, starters, bench: state.bench.map(player).filter((entry): entry is FivePlayer => Boolean(entry)), userId };
}

const aiClubNames = ["Løkka United", "Ballbingen BK", "Garasje FC", "Skolegården IL", "Futsal Fiends", "Kunstgress Kings", "Bakgården SK", "Innebandy-rømlingene", "Hallmesterne", "Femmerfabrikken"];

/** AI-laget på et trinn: fem tilfeldige personlige kort på trinnets rating, og en full benk. */
function aiTeam(seed: string, level: number, people: FivePerson[]): FiveTeam {
  const rating = fiveAiRating(level);
  const pool = [...people].sort((first, second) => seededRoll(`${seed}:pick:${first.personId}`) - seededRoll(`${seed}:pick:${second.personId}`));
  const player = (person: FivePerson, index: number): FivePlayer => ({
    id: `ai-${index}`, personId: person.personId, name: person.name, slug: person.slug,
    overall: Math.max(40, Math.min(99, rating + Math.round((seededRoll(`${seed}:spread:${index}`) - 0.5) * 4))),
  });
  const players = pool.slice(0, 5 + FIVE_BENCH).map(player);
  return { name: aiClubNames[(level - 1) % aiClubNames.length], formation: (["1-2-1", "2-2", "3-1", "1-1-2"] as const)[level % 4], starters: players.slice(0, 5), bench: players.slice(5), userId: null };
}

async function matchesToday(userId: string, kind: "ai" | "friend") {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin().from("five_matches").select("id", { count: "exact", head: true }).eq("home_user_id", userId).eq("kind", kind).gt("coins", 0).gte("created_at", start.toISOString());
  return count ?? 0;
}

function resultOf(home: number, away: number) {
  return home > away ? "win" : home === away ? "draw" : "loss";
}

/** Spiller neste kamp på AI-stigen. Kampen simuleres her og lagres ferdig, så går man til kampsiden. */
export async function playFiveAiAction(): Promise<ActionState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const people = await listFivePeople();
  const state = await getFiveState(user.id, people);
  if (!state) return { error: t.errors.notStarted };
  const home = teamFromState(state, user.username, user.id);
  if (!home) return { error: t.errors.needFive };
  const level = Math.min(FIVE_AI_LEVELS, state.profile.aiLevel);
  const seed = randomUUID();
  const away = aiTeam(seed, level, people);
  const match = simulateFiveMatch(seed, home, away);
  const rewarded = (await matchesToday(user.id, "ai")) < FIVE_REWARDED_AI_MATCHES_PER_DAY;
  const reward = rewarded ? fiveAiReward(level, resultOf(match.score.home, match.score.away)) : 0;
  const { data: matchId, error } = await supabaseAdmin().rpc("record_five_match", {
    target_user: user.id, match_kind: "ai", opponent: null, opponent_name: away.name, level,
    score_home: match.score.home, score_away: match.score.away, match_events: match, reward, card_stats: fiveCardStats(match),
  });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/femmer");
  redirect(`/femmer/kamp/${matchId}?live=1`);
}

/** Spiller mot en venns lagrede femmer. Vennen trenger ikke være pålogget. */
export async function playFiveFriendAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const opponentId = String(formData.get("opponent_id") ?? "");
  if (!opponentId || opponentId === user.id || !(await friendshipId(user.id, opponentId))) return { error: t.errors.onlyFriends };
  const people = await listFivePeople();
  const [state, opponentState, opponentProfile] = await Promise.all([
    getFiveState(user.id, people),
    getFiveState(opponentId, people),
    supabaseAdmin().from("profiles").select("username").eq("id", opponentId).maybeSingle(),
  ]);
  if (!state) return { error: t.errors.notStarted };
  const home = teamFromState(state, user.username, user.id);
  if (!home) return { error: t.errors.needFive };
  const away = opponentState ? teamFromState(opponentState, opponentProfile.data?.username ?? "?", opponentId) : null;
  if (!away) return { error: t.errors.friendNotReady };
  const seed = randomUUID();
  const match = simulateFiveMatch(seed, home, away);
  const rewarded = (await matchesToday(user.id, "friend")) < FIVE_REWARDED_FRIEND_MATCHES_PER_DAY;
  const reward = rewarded ? fiveFriendReward(resultOf(match.score.home, match.score.away)) : 0;
  const { data: matchId, error } = await supabaseAdmin().rpc("record_five_match", {
    target_user: user.id, match_kind: "friend", opponent: opponentId, opponent_name: away.name, level: null,
    score_home: match.score.home, score_away: match.score.away, match_events: match, reward, card_stats: fiveCardStats(match),
  });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/femmer");
  redirect(`/femmer/kamp/${matchId}?live=1`);
}
