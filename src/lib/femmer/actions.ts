"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbErrorMessage, getT } from "@/i18n/server";
import type { ActionState } from "../actions";
import { requireUser } from "../auth";
import { friendshipId } from "../friends";
import { supabaseAdmin } from "../supabase/server";
import { getFiveMatch, getFiveState, getLiveFiveMatchId, listFivePeople } from "./data";
import { aiTeam, createLiveMatch, resolveShot, settleIfFinished, shotChoiceOpen, teamFromState } from "./live";
import type { FiveShotResult } from "./match";
import { fiveObjectives, getFiveObjectives } from "./objectives";
import { FIVE_AI_LEVELS, fivePacks, fivePositions, isFiveFormation, isFivePosition } from "./rules";
import { fiveRoundRobin, getFiveSeason } from "./seasons";

const path = "/femmer";

export async function startFiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const picked = formData.getAll("person_id").map(String).filter(Boolean);
  // Posisjonen til hvert kort, i samme rekkefølge som laget: eget kort først (hvis man har ett), så de valgte.
  const positions = formData.getAll("position").map(String);
  if (positions.some((position) => !isFivePosition(position))) return { error: (await getT()).femmer.errors.invalidPosition };
  const { error } = await supabaseAdmin().rpc("start_five_career", { target_user: user.id, picked, positions });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath(path);
  return { ok: true };
}

export async function saveFiveLineupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const formation = String(formData.get("formation") ?? "");
  const starters = formData.getAll("starter_ids").map(String).filter(Boolean);
  const bench = formData.getAll("bench_ids").map(String).filter(Boolean);
  if (!isFiveFormation(formation)) return { error: t.errors.invalidFormation };
  // Vanlig-kortet og informen til samme person kan ikke stå i laget samtidig.
  const { data: cards } = await supabaseAdmin().from("five_cards").select("person_id").eq("owner_id", user.id).in("id", [...starters, ...bench]);
  const people = (cards ?? []).map((card) => card.person_id);
  if (new Set(people).size !== people.length) return { error: t.errors.samePersonTwice };
  const { error } = await supabaseAdmin().rpc("save_five_lineup", { target_user: user.id, next_formation: formation, next_starters: starters, next_bench: bench });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath(path);
  return { ok: true };
}

export type FivePull = { cardId: string; personId: string; informId: string | null; overall: number; upgrade: boolean };
export type FivePackState = ActionState & { pulls?: FivePull[]; openedAt?: number; coins?: number; streak?: number };
type RawPull = { card_id: string; person_id: string; inform_id: string | null; overall: number; upgrade: boolean };
const toPulls = (data: unknown): FivePull[] => ((Array.isArray(data) ? data : []) as RawPull[]).map((pull) => ({ cardId: pull.card_id, personId: pull.person_id, informId: pull.inform_id ?? null, overall: pull.overall, upgrade: pull.upgrade }));

export async function openFivePackAction(_prev: FivePackState, formData: FormData): Promise<FivePackState> {
  const user = await requireUser();
  const pack = fivePacks.find((entry) => entry.key === formData.get("pack_key"));
  if (!pack) return { error: (await getT()).femmer.errors.invalidPack };
  const { data, error } = await supabaseAdmin().rpc("open_five_pack", { target_user: user.id, card_count: pack.cards, pack_price: pack.price });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath(path);
  return { ok: true, pulls: toPulls(data), openedAt: Date.now() };
}

export async function claimFiveLoginAction(): Promise<FivePackState> {
  const user = await requireUser();
  const { data, error } = await supabaseAdmin().rpc("claim_five_login", { target_user: user.id });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath(path);
  const result = (data ?? {}) as { streak?: number; coins?: number; pulls?: unknown };
  return { ok: true, pulls: toPulls(result.pulls), openedAt: Date.now(), coins: Number(result.coins ?? 0), streak: Number(result.streak ?? 1) };
}

export async function claimFiveObjectiveAction(_prev: FivePackState, formData: FormData): Promise<FivePackState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const key = String(formData.get("objective") ?? "");
  if (!fiveObjectives.some((objective) => objective.key === key)) return { error: t.errors.objectiveNotDone };
  // Fremgangen sjekkes her på serveren; databasen passer på at premien bare hentes én gang per periode.
  const status = (await getFiveObjectives(user.id)).find((objective) => objective.key === key)!;
  if (status.progress < status.target) return { error: t.errors.objectiveNotDone };
  const { data, error } = await supabaseAdmin().rpc("claim_five_objective", { target_user: user.id, objective_key: key, period: status.periodStart, reward_coins: status.coins, pack_cards: status.packCards, with_inform: status.inform });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath(path);
  return { ok: true, pulls: toPulls(data), openedAt: Date.now(), coins: status.coins };
}

export async function upgradeFiveCardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { error } = await supabaseAdmin().rpc("upgrade_five_card", { target_user: user.id, target_card: String(formData.get("card_id") ?? "") });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath(path);
  return { ok: true };
}

export async function setFiveCardPositionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const position = String(formData.get("position") ?? "");
  if (!(fivePositions as readonly string[]).includes(position)) return { error: (await getT()).femmer.errors.invalidPosition };
  const { error } = await supabaseAdmin().rpc("set_five_card_position", { target_user: user.id, target_card: String(formData.get("card_id") ?? ""), next_position: position });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath(path);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Kamper
// ---------------------------------------------------------------------------

/** Har brukeren en kamp på gang, må den spilles ferdig først. Er den ferdig på klokka, gjøres den opp nå. */
async function liveMatchBlocking(userId: string) {
  const live = await getLiveFiveMatchId(userId);
  if (!live) return null;
  return (await settleIfFinished(live)) ? null : live;
}

export async function playFiveAiAction(): Promise<ActionState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const blocking = await liveMatchBlocking(user.id);
  if (blocking) redirect(`/femmer/kamp/${blocking}`);
  const [people, state] = await Promise.all([listFivePeople(), getFiveState(user.id)]);
  if (!state) return { error: t.errors.notStarted };
  const home = teamFromState(state, user.username, user.id);
  if (!home) return { error: t.errors.needFive };
  const level = Math.min(FIVE_AI_LEVELS, state.profile.aiLevel);
  const away = aiTeam(`${user.id}:${Date.now()}`, level, people);
  const matchId = await createLiveMatch({ kind: "ai", home, away, controllerId: user.id, controllerSide: "home", homeUserId: user.id, awayUserId: null, level, seasonId: null });
  if (!matchId) return { error: t.errors.matchInProgress };
  revalidatePath(path);
  redirect(`/femmer/kamp/${matchId}`);
}

/** Spiller mot en venns lagrede femmer. Vennen trenger ikke være pålogget. */
export async function playFiveFriendAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const opponentId = String(formData.get("opponent_id") ?? "");
  if (!opponentId || opponentId === user.id || !(await friendshipId(user.id, opponentId))) return { error: t.errors.onlyFriends };
  const blocking = await liveMatchBlocking(user.id);
  if (blocking) redirect(`/femmer/kamp/${blocking}`);
  const [state, opponentState, opponentProfile] = await Promise.all([getFiveState(user.id), getFiveState(opponentId), supabaseAdmin().from("profiles").select("username").eq("id", opponentId).maybeSingle()]);
  if (!state) return { error: t.errors.notStarted };
  const home = teamFromState(state, user.username, user.id);
  if (!home) return { error: t.errors.needFive };
  const away = opponentState ? teamFromState(opponentState, opponentProfile.data?.username ?? "?", opponentId) : null;
  if (!away) return { error: t.errors.friendNotReady };
  const matchId = await createLiveMatch({ kind: "friend", home, away, controllerId: user.id, controllerSide: "home", homeUserId: user.id, awayUserId: opponentId, level: null, seasonId: null });
  if (!matchId) return { error: t.errors.matchInProgress };
  revalidatePath(path);
  redirect(`/femmer/kamp/${matchId}`);
}

/** Spiller en kamp i en vennesesong. Den av de to som starter kampen, tar valgene; den andre spiller med sitt lagrede lag. */
export async function playFiveFixtureAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const db = supabaseAdmin();
  const { data: fixture } = await db.from("five_season_fixtures").select("*").eq("id", String(formData.get("fixture_id") ?? "")).maybeSingle();
  if (!fixture || (fixture.home_user_id !== user.id && fixture.away_user_id !== user.id)) return { error: t.errors.fixtureUnavailable };
  if (fixture.status === "live" && fixture.match_id) {
    if (!(await settleIfFinished(fixture.match_id))) redirect(`/femmer/kamp/${fixture.match_id}`);
    return { error: t.errors.fixtureUnavailable };
  }
  if (fixture.status !== "scheduled") return { error: t.errors.fixtureUnavailable };
  const blocking = await liveMatchBlocking(user.id);
  if (blocking) redirect(`/femmer/kamp/${blocking}`);
  const { data: profiles } = await db.from("profiles").select("id, username").in("id", [fixture.home_user_id, fixture.away_user_id]);
  const name = (id: string) => profiles?.find((profile) => profile.id === id)?.username ?? "?";
  const [homeState, awayState] = await Promise.all([getFiveState(fixture.home_user_id), getFiveState(fixture.away_user_id)]);
  const home = homeState ? teamFromState(homeState, name(fixture.home_user_id), fixture.home_user_id) : null;
  const away = awayState ? teamFromState(awayState, name(fixture.away_user_id), fixture.away_user_id) : null;
  if (!home || !away) return { error: t.errors.friendNotReady };
  const controllerSide = fixture.home_user_id === user.id ? "home" : "away";
  const matchId = await createLiveMatch({ kind: "season", home, away, controllerId: user.id, controllerSide, homeUserId: fixture.home_user_id, awayUserId: fixture.away_user_id, level: null, seasonId: fixture.season_id });
  if (!matchId) return { error: t.errors.matchInProgress };
  // Rakk den andre å starte samme kamp, slettes vår og den andres vinner.
  const { data: claimed } = await db.from("five_season_fixtures").update({ status: "live", match_id: matchId }).eq("id", fixture.id).eq("status", "scheduled").select("id");
  if (!claimed?.length) { await db.from("five_matches").delete().eq("id", matchId); return { error: t.errors.fixtureUnavailable }; }
  revalidatePath(path);
  redirect(`/femmer/kamp/${matchId}`);
}

export type FiveShotState = ActionState & { result?: FiveShotResult };

/** Valget på et stopp (rute som skytter eller keeper). Uten rute (tiden gikk ut) velges det tilfeldig. */
export async function chooseFiveShotAction(matchId: string, minute: number, cell: number | null): Promise<FiveShotState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const match = await getFiveMatch(matchId, user.id);
  if (!match?.data || match.status !== "live" || !match.startedAt || match.controllerId !== user.id) return { error: t.errors.matchNotLive };
  const existing = match.shots.find((shot) => shot.minute === minute && shot.outcome);
  if (existing) return { ok: true, result: existing };
  // Et valg som kommer for sent, teller ikke; da avgjøres det som om tiden gikk ut.
  const pick = cell !== null && shotChoiceOpen(match.data, match.startedAt, minute) ? cell : null;
  const result = await resolveShot(matchId, match.data, minute, pick);
  return result ? { ok: true, result } : { error: t.errors.matchNotLive };
}

export type FiveCompleteState = ActionState & { coins?: number; shots?: FiveShotResult[] };

/**
 * Kalles når klokka har gått ut. Kampen gjøres opp bare hvis serverens klokke sier at den er ferdig.
 * Svarer med myntene til den som spør og alle avgjorte stopp, så kampsiden kan vise sluttresultatet
 * uten å hentes på nytt før den sender brukeren tilbake.
 */
export async function completeFiveMatchAction(matchId: string): Promise<FiveCompleteState> {
  const user = await requireUser();
  const match = await getFiveMatch(matchId, user.id);
  if (!match) return { error: (await getT()).femmer.errors.matchNotLive };
  if (!(await settleIfFinished(matchId))) return { error: (await getT()).femmer.errors.matchNotFinished };
  revalidatePath(path); revalidatePath(`/femmer/kamp/${matchId}`);
  if (match.seasonId) revalidatePath(`/femmer/sesong/${match.seasonId}`);
  const settled = await getFiveMatch(matchId, user.id);
  const coins = settled ? (settled.homeUserId === user.id ? settled.coins : settled.awayCoins) : 0;
  return { ok: true, coins, shots: settled?.shots ?? [] };
}

// ---------------------------------------------------------------------------
// Vennesesonger
// ---------------------------------------------------------------------------

export async function createFiveSeasonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  if (!name) return { error: t.errors.seasonName };
  if (!(await getFiveState(user.id))) return { error: t.errors.notStarted };
  const invited = formData.getAll("friend_id").map(String).filter(Boolean).slice(0, 15);
  const db = supabaseAdmin();
  const { data: season, error } = await db.from("five_seasons").insert({ name, owner_id: user.id }).select("id").single();
  if (error) return { error: await dbErrorMessage(error) };
  const friends = (await Promise.all(invited.map(async (id) => ((await friendshipId(user.id, id)) ? id : null)))).filter((id): id is string => Boolean(id));
  await db.from("five_season_members").insert([{ season_id: season.id, user_id: user.id, status: "joined", joined_at: new Date().toISOString() }, ...friends.map((id) => ({ season_id: season.id, user_id: id, status: "invited" }))]);
  revalidatePath(path);
  redirect(`/femmer/sesong/${season.id}`);
}

export async function inviteFiveSeasonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const season = await getFiveSeason(String(formData.get("season_id") ?? ""));
  const friendId = String(formData.get("friend_id") ?? "");
  if (!season || season.status !== "open" || !season.members.some((member) => member.userId === user.id && member.status === "joined")) return { error: t.errors.seasonUnavailable };
  if (!(await friendshipId(user.id, friendId))) return { error: t.errors.onlyFriends };
  await supabaseAdmin().from("five_season_members").upsert({ season_id: season.id, user_id: friendId, status: "invited" }, { onConflict: "season_id,user_id", ignoreDuplicates: true });
  revalidatePath(`/femmer/sesong/${season.id}`);
  return { ok: true };
}

/** Bli med fra en invitasjon eller fra invitasjonslenken (koden). */
export async function joinFiveSeasonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const db = supabaseAdmin();
  const code = String(formData.get("code") ?? "").toUpperCase();
  let seasonId = String(formData.get("season_id") ?? "");
  if (code) {
    const { data } = await db.from("five_seasons").select("id").eq("invite_code", code).maybeSingle();
    seasonId = data?.id ?? "";
  } else {
    const { data } = await db.from("five_season_members").select("season_id").eq("season_id", seasonId).eq("user_id", user.id).maybeSingle();
    if (!data) return { error: t.errors.seasonUnavailable };
  }
  if (!seasonId) return { error: t.errors.seasonUnavailable };
  const { error } = await db.rpc("join_five_season", { target_user: user.id, target_season: seasonId });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath(path);
  redirect(`/femmer/sesong/${seasonId}`);
}

export async function declineFiveSeasonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  await supabaseAdmin().from("five_season_members").delete().eq("season_id", String(formData.get("season_id") ?? "")).eq("user_id", user.id).eq("status", "invited");
  revalidatePath(path);
  return { ok: true };
}

export async function startFiveSeasonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = (await getT()).femmer;
  const season = await getFiveSeason(String(formData.get("season_id") ?? ""));
  if (!season) return { error: t.errors.seasonUnavailable };
  const joined = season.members.filter((member) => member.status === "joined").map((member) => member.userId).sort(() => Math.random() - 0.5);
  const { error } = await supabaseAdmin().rpc("start_five_season", { target_user: user.id, target_season: season.id, fixtures: fiveRoundRobin(joined) });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath(`/femmer/sesong/${season.id}`);
  return { ok: true };
}
