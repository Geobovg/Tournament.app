"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./auth";
import { ALL_STATS, type StatKey, upgradeCost } from "./career-stats";
import { STAT_GROUPS } from "./career-stats";
import { friendshipId } from "./friends";
import type { ActionState } from "./actions";
import { incrementCareerRecord, type CareerRecordColumn } from "./career-rewards";
import { autoShotCell, getManagerKickoff, getManagerShots, getManagerSubstitutions, matchClock, planManagerTimeline, plannedDurationMs, playersById, resolveShot, SHOT_CHOICE_MS, shootingOf, shotMinutesOf, SUB_WINDOW_MINUTE, teamAfterSubstitutions, type ManagerKickoffEvent, type ManagerPlayerSnapshot } from "./manager-match";
import { supabaseAdmin } from "./supabase/server";

function profilePaths() { revalidatePath("/profile"); revalidatePath("/spillerkarriere"); revalidatePath("/managerkarriere"); }

function uniqueIds(value: unknown) { return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : []; }

async function createManagerKickoff(db: ReturnType<typeof supabaseAdmin>, homeUserId: string, awayUserId: string): Promise<ManagerKickoffEvent | { error: string }> {
  const { data: lineups, error: lineupsError } = await db.from("manager_lineups").select("user_id, formation, starters, bench").in("user_id", [homeUserId, awayUserId]);
  if (lineupsError) return { error: lineupsError.message };
  const homeLineup = (lineups ?? []).find((lineup) => lineup.user_id === homeUserId);
  const awayLineup = (lineups ?? []).find((lineup) => lineup.user_id === awayUserId);
  if (!homeLineup || !awayLineup) return { error: "Begge managerne må ha en lagret ellever" };
  const allIds = [...uniqueIds(homeLineup.starters), ...uniqueIds(homeLineup.bench), ...uniqueIds(awayLineup.starters), ...uniqueIds(awayLineup.bench)];
  // Katalogdataene blir med i laguttaket slik at kampbildet kan tegne spillerkortene uten flere oppslag.
  const { data: cards, error: cardsError } = allIds.length ? await db.from("manager_cards").select("id, owner_id, name, position, overall, player_catalog(slug, club, accent)").in("id", allIds) : { data: [], error: null };
  if (cardsError) return { error: cardsError.message };
  const snapshotFor = (userId: string, lineup: typeof homeLineup) => {
    const starters = uniqueIds(lineup.starters); const bench = uniqueIds(lineup.bench);
    if (starters.length !== 11 || bench.length > 7 || starters.some((id) => bench.includes(id))) return null;
    const owned = new Map<string, ManagerPlayerSnapshot>();
    for (const card of (cards ?? []).filter((card) => card.owner_id === userId)) {
      const catalog = Array.isArray(card.player_catalog) ? card.player_catalog[0] : card.player_catalog;
      owned.set(card.id, { id: card.id, name: card.name, position: card.position, overall: card.overall, slug: catalog?.slug ?? null, club: catalog?.club ?? null, accent: catalog?.accent ?? null });
    }
    const selectedStarters = starters.map((id) => owned.get(id)).filter((card): card is ManagerPlayerSnapshot => Boolean(card));
    const selectedBench = bench.map((id) => owned.get(id)).filter((card): card is ManagerPlayerSnapshot => Boolean(card));
    return selectedStarters.length === 11 && selectedBench.length === bench.length ? { userId, formation: lineup.formation, starters: selectedStarters, bench: selectedBench } : null;
  };
  const home = snapshotFor(homeUserId, homeLineup); const away = snapshotFor(awayUserId, awayLineup);
  if (!home || !away) return { error: "Begge managerne må ha 11 gyldige spillere i startelleveren" };
  return { type: "kickoff", version: 2, home, away };
}

export async function upgradePlayerStatAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const stat = String(formData.get("stat") ?? "") as StatKey;
  if (!ALL_STATS.includes(stat)) return { error: "Ugyldig egenskap" };
  const db = supabaseAdmin();
  const { data: profile } = await db.from("player_profiles").select("player_points, stats").eq("user_id", user.id).maybeSingle();
  if (!profile) return { error: "Fant ikke spillerprofilen" };
  const stats = profile.stats as Record<StatKey, number>;
  const value = Number(stats[stat] ?? 50);
  if (value >= 99) return { error: "Denne egenskapen har allerede 99" };
  const cost = upgradeCost(value);
  if (profile.player_points < cost) return { error: `Du trenger ${cost} spillerpoeng` };
  const { error } = await db.from("player_profiles").update({ stats: { ...stats, [stat]: value + 1 }, player_points: profile.player_points - cost, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("player_points", profile.player_points);
  if (error) return { error: error.message };
  profilePaths();
  return { ok: true };
}

export async function updateCareerIdentityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const playerName = String(formData.get("player_name") ?? "").trim();
  const clubName = String(formData.get("club_name") ?? "").trim();
  const position = String(formData.get("primary_position") ?? "");
  if (playerName.length < 2 || playerName.length > 24 || clubName.length < 2 || clubName.length > 32) return { error: "Sjekk navnene du har valgt" };
  if (!(["forward", "midfielder", "defender"] as string[]).includes(position)) return { error: "Ugyldig posisjon" };
  const appearance = { skinTone: String(formData.get("skin_tone") ?? "medium"), hair: String(formData.get("hair") ?? "short"), hairColor: String(formData.get("hair_color") ?? "brown"), beard: String(formData.get("beard") ?? "none"), kitNumber: Math.max(1, Math.min(99, Number(formData.get("kit_number") ?? 10))), boots: String(formData.get("boots") ?? "black"), armband: formData.get("armband") === "on" };
  const club_style = { primary: String(formData.get("club_primary") ?? "#35d06a"), secondary: String(formData.get("club_secondary") ?? "#071a10"), crest: String(formData.get("crest") ?? "shield") };
  const { error } = await supabaseAdmin().from("player_profiles").update({ player_name: playerName, club_name: clubName, primary_position: position, appearance, club_style, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  if (error) return { error: error.message };
  profilePaths();
  return { ok: true };
}

export async function createCareerChallengeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const opponentId = String(formData.get("opponent_id") ?? "");
  const mode = String(formData.get("mode") ?? "");
  if (!(await friendshipId(user.id, opponentId))) return { error: "Du kan bare utfordre venner" };
  if (mode !== "player" && mode !== "manager") return { error: "Velg karriere" };
  const { error } = await supabaseAdmin().from("career_challenges").insert({ challenger_id: user.id, opponent_id: opponentId, mode });
  if (error) return { error: error.message };
  profilePaths(); revalidatePath("/venner");
  return { ok: true };
}

export async function acceptCareerChallengeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const challengeId = String(formData.get("challenge_id") ?? ""); const db = supabaseAdmin();
  const { data: challenge } = await db.from("career_challenges").select("*").eq("id", challengeId).maybeSingle();
  if (!challenge || challenge.opponent_id !== user.id || challenge.status !== "pending" || new Date(challenge.expires_at) <= new Date()) return { error: "Utfordringen er ikke lenger tilgjengelig" };
  if (challenge.mode === "manager") { const { data: lineup } = await db.from("manager_lineups").select("starters").eq("user_id", user.id).maybeSingle(); if (!lineup || lineup.starters.length !== 11) return { error: "Velg en ellever før du godtar managerkampen" }; }
  const { error } = await db.from("career_matches").insert({ challenge_id: challenge.id, mode: challenge.mode, home_user_id: challenge.challenger_id, away_user_id: challenge.opponent_id });
  if (error) return { error: error.message };
  await db.from("career_challenges").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", challenge.id).eq("status", "pending");
  profilePaths(); return { ok: true };
}

export async function startCareerMatchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const matchId = String(formData.get("match_id") ?? ""); const db = supabaseAdmin();
  const { data: match } = await db.from("career_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || (match.home_user_id !== user.id && match.away_user_id !== user.id) || match.status !== "lobby") return { error: "Kampen kan ikke startes" };
  const startedAt = new Date().toISOString();
  const kickoff = match.mode === "manager" ? await createManagerKickoff(db, match.home_user_id, match.away_user_id) : null;
  if (kickoff && "error" in kickoff) return { error: kickoff.error };
  const managerEvents = kickoff ? planManagerTimeline(match.id, [kickoff]) : null;
  const { error } = await db.from("career_matches").update({ status: "live", started_at: startedAt, ...(match.mode === "player" ? { events: [{ leader: match.home_user_id, startedAt }] } : { events: managerEvents }) }).eq("id", matchId).eq("status", "lobby");
  if (error) return { error: error.message }; profilePaths(); return { ok: true };
}

async function rewardCareerWinner(userId: string, matchId: string, playerPoints: number, managerBudget: number, key: string, record: CareerRecordColumn) {
  const db = supabaseAdmin();
  const { data } = await db.from("career_reward_events").upsert({ user_id: userId, source_type: "career_match", source_id: matchId, reward_key: key, player_points: playerPoints, manager_budget: managerBudget }, { onConflict: "user_id,source_type,source_id,reward_key", ignoreDuplicates: true }).select("id");
  if (!data?.length) return;
  if (playerPoints || managerBudget) {
    const { data: profile } = await db.from("player_profiles").select("player_points, player_points_earned, manager_budget, manager_budget_earned").eq("user_id", userId).maybeSingle();
    if (profile) await db.from("player_profiles").update({ player_points: profile.player_points + playerPoints, player_points_earned: profile.player_points_earned + playerPoints, manager_budget: profile.manager_budget + managerBudget, manager_budget_earned: profile.manager_budget_earned + managerBudget, updated_at: new Date().toISOString() }).eq("user_id", userId);
  }
  await incrementCareerRecord(userId, record);
}

export async function completeManagerMatchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const matchId = String(formData.get("match_id") ?? ""); const db = supabaseAdmin();
  const { data: match } = await db.from("career_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || match.mode !== "manager" || (match.home_user_id !== user.id && match.away_user_id !== user.id)) return { error: "Fant ikke managerkampen" };
  if (match.status === "completed") return { ok: true };
  // Kampen varer lenger når den har stoppet for straffer, så lengden leses ut av selve planen.
  const fullTime = plannedDurationMs(shotMinutesOf(Array.isArray(match.events) ? match.events : []));
  if (match.status !== "live" || !match.started_at || Date.now() - new Date(match.started_at).getTime() < fullTime) return { error: "Kampen er ikke ferdig ennå" };
  const { error } = await db.rpc("settle_finished_manager_matches", { target_match: matchId });
  if (error) return { error: error.message };
  revalidatePath(`/karriere/kamp/${matchId}`); profilePaths(); return { ok: true };
}

/** Felles oppslag for de tre handlingene som skjer mens en managerkamp går. */
async function liveManagerMatch(matchId: string, userId: string) {
  const db = supabaseAdmin();
  const { data: match } = await db.from("career_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || match.mode !== "manager" || match.status !== "live" || !match.started_at) return { error: "Kampen er ikke aktiv" } as const;
  const events = Array.isArray(match.events) ? match.events : [];
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return { error: "Kampens laguttak mangler" } as const;
  const side = kickoff.home.userId === userId ? "home" : kickoff.away.userId === userId ? "away" : null;
  if (!side) return { error: "Du deltar ikke i denne kampen" } as const;
  const elapsed = Date.now() - new Date(match.started_at).getTime();
  return { db, match, events, side, elapsed, clock: matchClock(elapsed, shotMinutesOf(events)) } as const;
}

export async function makeManagerSubstitutionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const matchId = String(formData.get("match_id") ?? "");
  const outId = String(formData.get("out_id") ?? "");
  const inId = String(formData.get("in_id") ?? "");
  const live = await liveManagerMatch(matchId, user.id);
  if ("error" in live) return { error: live.error };
  const { db, events, side, clock } = live;
  if (clock.phase !== "substitutions") return { error: "Bytter kan bare gjøres i byttevinduet på 70′" };
  if (getManagerSubstitutions(events).filter((event) => event.side === side).length >= 3) return { error: "Du har allerede brukt tre bytter" };
  const team = teamAfterSubstitutions(events, side);
  if (!team?.starters.some((player) => player.id === outId) || !team.bench.some((player) => player.id === inId)) return { error: "Velg en spiller fra elleveren og en fra benken" };
  // Byttet skjer på 70′, så det slår inn fra 71′ og kan aldri skrive om noe som alt er spilt.
  const nextEvents = planManagerTimeline(matchId, [...events, { type: "substitution", side, outId, inId, minute: SUB_WINDOW_MINUTE }]);
  const { error } = await db.from("career_matches").update({ events: nextEvents }).eq("id", matchId).eq("status", "live");
  if (error) return { error: error.message };
  revalidatePath(`/karriere/kamp/${matchId}`);
  return { ok: true };
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
  if (!Number.isInteger(minute) || !Number.isInteger(cell)) return { error: "Ugyldig valg" };
  const live = await liveManagerMatch(matchId, user.id);
  if ("error" in live) return { error: live.error };
  const { db, events, side, clock } = live;
  const shot = getManagerShots(events).find((entry) => entry.minute === minute);
  if (!shot) return { error: "Fant ikke sjansen" };
  if (clock.shotMinute !== minute) return { error: "Denne sjansen er ikke aktiv nå" };
  if (clock.shotElapsedMs >= SHOT_CHOICE_MS) return { error: "Tiden er ute" };
  if (!shot.options.includes(cell)) return { error: "Du kan ikke sikte dit" };
  const role = shot.side === side ? "shooter" : "keeper";
  if (role === "keeper" && shot.kind !== "penalty") return { error: "Bare straffespark har keepervalg" };
  const { error } = await db.rpc("record_shot_choice", { target_match: matchId, target_minute: minute, target_kind: shot.kind, target_side: shot.side, target_role: role, target_cell: cell });
  if (error) return { error: error.message };
  revalidatePath(`/karriere/kamp/${matchId}`);
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
  if (!Number.isInteger(minute)) return { error: "Ugyldig sjanse" };
  const live = await liveManagerMatch(matchId, user.id);
  if ("error" in live) return { error: live.error };
  const { db, events, clock } = live;
  const shot = getManagerShots(events).find((entry) => entry.minute === minute);
  if (!shot) return { error: "Fant ikke sjansen" };
  const choiceOver = clock.shotMinute !== minute || clock.shotElapsedMs >= SHOT_CHOICE_MS;
  if (!choiceOver) return { error: "Tiden til å velge er ikke ute ennå" };

  const { data: row } = await db.from("career_match_shots").select("shooter_cell, keeper_cell, outcome").eq("match_id", matchId).eq("minute", minute).maybeSingle();
  if (row?.outcome) return { ok: true };

  // Rakk man ikke å trykke, velges det for en – ellers ville en motstander som ikke fulgte med
  // gjort straffen til en gratis scoring.
  const shooterCell = row?.shooter_cell ?? autoShotCell(matchId, shot, "shooter");
  const keeperCell = shot.kind === "penalty" ? (row?.keeper_cell ?? autoShotCell(matchId, shot, "keeper")) : null;
  const taker = playersById(events).get(shot.takerId);
  const outcome = resolveShot(matchId, shot, taker ? shootingOf(taker) : 70, shooterCell, keeperCell);

  const { error } = await db
    .from("career_match_shots")
    .upsert({ match_id: matchId, minute, kind: shot.kind, side: shot.side, shooter_cell: shooterCell, keeper_cell: keeperCell, outcome, resolved_at: new Date().toISOString() }, { onConflict: "match_id,minute" })
    .is("outcome", null);
  if (error) return { error: error.message };
  revalidatePath(`/karriere/kamp/${matchId}`);
  return { ok: true };
}

type PlayerRound = { leader: string; category?: string; startedAt: string; homeStat?: StatKey; awayStat?: StatKey; homeValue?: number; awayValue?: number; winnerId?: string | null };
export async function choosePlayerCareerStatAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const matchId = String(formData.get("match_id") ?? ""); const stat = String(formData.get("stat") ?? "") as StatKey;
  if (!ALL_STATS.includes(stat)) return { error: "Velg en gyldig egenskap" };
  const db = supabaseAdmin(); const { data: match } = await db.from("career_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || match.mode !== "player" || match.status !== "live" || (match.home_user_id !== user.id && match.away_user_id !== user.id)) return { error: "Spillerkampen er ikke aktiv" };
  const events = (match.events ?? []) as PlayerRound[]; const partial = events.at(-1); if (!partial) return { error: "Runden er ikke klar" }; const usedStats = events.flatMap((round) => [round.homeStat, round.awayStat]).filter((value): value is StatKey => Boolean(value));
  if (usedStats.includes(stat)) return { error: "Denne egenskapen er allerede brukt i kampen" };
  const group = Object.entries(STAT_GROUPS).find(([, stats]) => (stats as readonly string[]).includes(stat))?.[0]; if (!group) return { error: "Fant ikke kategorien" };
  if (Date.now() - new Date(partial.startedAt).getTime() > 30_000) return { error: "Tiden er ute – registrer rundetapet" };
  if (!partial.category) {
    if (partial.leader !== user.id) return { error: "Vent på at motstanderen velger først" };
    const round: PlayerRound = { ...partial, category: group, ...(partial.leader === match.home_user_id ? { homeStat: stat } : { awayStat: stat }) };
    const { error } = await db.from("career_matches").update({ events: [...events.slice(0, -1), round] }).eq("id", matchId).eq("status", "live");
    if (error) return { error: error.message }; revalidatePath(`/karriere/kamp/${matchId}`); return { ok: true };
  }
  if (partial.leader === user.id) return { error: "Vent på motstanderens valg" };
  if (partial.category !== group) return { error: `Velg en annen egenskap innen ${partial.category}` };
  const { data: profiles } = await db.from("player_profiles").select("user_id, stats").in("user_id", [match.home_user_id, match.away_user_id]);
  const profile = new Map((profiles ?? []).map((row) => [row.user_id, row.stats as Record<StatKey, number>])); const homeStat = partial.homeStat ?? stat; const awayStat = partial.awayStat ?? stat; const homeValue = profile.get(match.home_user_id)?.[homeStat] ?? 0; const awayValue = profile.get(match.away_user_id)?.[awayStat] ?? 0; const winnerId = homeValue === awayValue ? null : homeValue > awayValue ? match.home_user_id : match.away_user_id;
  const resolved: PlayerRound = { ...partial, homeStat, awayStat, homeValue, awayValue, winnerId }; const completedRounds = [...events.slice(0, -1), resolved]; const homePoints = completedRounds.filter((round) => round.winnerId === match.home_user_id).length; const awayPoints = completedRounds.filter((round) => round.winnerId === match.away_user_id).length; const settled = completedRounds.length >= 10; const matchWinner = homePoints === awayPoints ? null : homePoints > awayPoints ? match.home_user_id : match.away_user_id; const nextEvents = settled ? completedRounds : [...completedRounds, { leader: completedRounds.length % 2 === 0 ? match.home_user_id : match.away_user_id, startedAt: new Date().toISOString() }];
  const { error } = await db.from("career_matches").update({ events: nextEvents, ...(settled ? { status: "completed", winner_id: matchWinner, home_score: homePoints, away_score: awayPoints, completed_at: new Date().toISOString() } : {}) }).eq("id", matchId).eq("status", "live");
  if (error) return { error: error.message };
  if (settled && matchWinner) {
    const loserId = matchWinner === match.home_user_id ? match.away_user_id : match.home_user_id;
    await Promise.all([rewardCareerWinner(matchWinner, matchId, 5, 0, "player_win", "player_career_wins"), rewardCareerWinner(loserId, matchId, 0, 0, "player_loss", "player_career_losses")]);
  } else if (settled) await Promise.all([rewardCareerWinner(match.home_user_id, matchId, 2, 0, "player_draw", "player_career_draws"), rewardCareerWinner(match.away_user_id, matchId, 2, 0, "player_draw", "player_career_draws")]);
  revalidatePath(`/karriere/kamp/${matchId}`); profilePaths(); return { ok: true };
}

export async function forfeitPlayerCareerRoundAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const matchId = String(formData.get("match_id") ?? ""); const db = supabaseAdmin(); const { data: match } = await db.from("career_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || match.mode !== "player" || match.status !== "live" || (match.home_user_id !== user.id && match.away_user_id !== user.id)) return { error: "Kampen er ikke aktiv" };
  const events = (match.events ?? []) as PlayerRound[]; const partial = events.at(-1); if (!partial || Date.now() - new Date(partial.startedAt).getTime() <= 30_000) return { error: "Tiden har ikke gått ut ennå" };
  const winnerId = !partial.category ? (partial.leader === match.home_user_id ? match.away_user_id : match.home_user_id) : partial.leader; const resolved = { ...partial, winnerId }; const completedRounds = [...events.slice(0, -1), resolved]; const homePoints = completedRounds.filter((round) => round.winnerId === match.home_user_id).length; const awayPoints = completedRounds.filter((round) => round.winnerId === match.away_user_id).length; const settled = completedRounds.length >= 10; const matchWinner = homePoints === awayPoints ? null : homePoints > awayPoints ? match.home_user_id : match.away_user_id; const nextEvents = settled ? completedRounds : [...completedRounds, { leader: completedRounds.length % 2 === 0 ? match.home_user_id : match.away_user_id, startedAt: new Date().toISOString() }];
  const { error } = await db.from("career_matches").update({ events: nextEvents, ...(settled ? { status: "completed", winner_id: matchWinner, home_score: homePoints, away_score: awayPoints, completed_at: new Date().toISOString() } : {}) }).eq("id", matchId).eq("status", "live"); if (error) return { error: error.message }; if (settled && matchWinner) { const loserId = matchWinner === match.home_user_id ? match.away_user_id : match.home_user_id; await Promise.all([rewardCareerWinner(matchWinner, matchId, 5, 0, "player_win", "player_career_wins"), rewardCareerWinner(loserId, matchId, 0, 0, "player_loss", "player_career_losses")]); } else if (settled) await Promise.all([rewardCareerWinner(match.home_user_id, matchId, 2, 0, "player_draw", "player_career_draws"), rewardCareerWinner(match.away_user_id, matchId, 2, 0, "player_draw", "player_career_draws")]); revalidatePath(`/karriere/kamp/${matchId}`); profilePaths(); return { ok: true };
}
