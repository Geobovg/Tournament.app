import "server-only";

import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../supabase/server";
import { getFiveMatch, getLiveFiveMatchId, type FivePerson, type FiveState } from "./data";
import { fiveCardStats, fiveClock, fiveDurationMs, fiveScore, fiveShotMinutes, FIVE_SHOT_CELLS, FIVE_SHOT_CHOICE_MS, planFiveMatch, resolveFiveShot, seededRoll, type FiveMatchData, type FivePlayer, type FiveShotResult, type FiveSide, type FiveTeam } from "./match";
import { FIVE_BENCH, fiveAiRating, fiveAiReward, fiveFormations, fiveFriendReward, fiveSeasonReward, type FiveFormation, type FivePosition } from "./rules";

/** Laget slik brukeren har satt det opp, eller null uten en hel startfemmer. */
export function teamFromState(state: FiveState, name: string, userId: string): FiveTeam | null {
  const byId = new Map(state.cards.map((card) => [card.id, card]));
  const player = (id: string): FivePlayer | null => {
    const card = byId.get(id);
    return card ? { id: card.id, personId: card.personId, name: card.name, slug: card.slug, overall: card.overall, position: card.position, inform: Boolean(card.informId) } : null;
  };
  const starters = state.starters.map(player).filter((entry): entry is FivePlayer => Boolean(entry));
  if (starters.length !== 5) return null;
  return { name, formation: state.profile.formation, starters, bench: state.bench.map(player).filter((entry): entry is FivePlayer => Boolean(entry)), userId };
}

const aiClubNames = ["Løkka United", "Ballbingen BK", "Garasje FC", "Skolegården IL", "Futsal Fiends", "Kunstgress Kings", "Bakgården SK", "Innebandy-rømlingene", "Hallmesterne", "Femmerfabrikken"];
const aiFormations: FiveFormation[] = ["1-2-1", "2-2", "3-1", "1-1-2"];

/** AI-laget på et trinn: tilfeldige personlige kort på trinnets rating, på riktige posisjoner, og en full benk. */
export function aiTeam(seed: string, level: number, people: FivePerson[]): FiveTeam {
  const rating = fiveAiRating(level);
  const formation = aiFormations[level % aiFormations.length];
  const roles = fiveFormations[formation].map((slot) => slot.role);
  const pool = [...people].sort((first, second) => seededRoll(`${seed}:pick:${first.personId}`) - seededRoll(`${seed}:pick:${second.personId}`));
  const player = (person: FivePerson, index: number): FivePlayer => ({
    id: `ai-${index}`, personId: person.personId, name: person.name, slug: person.slug,
    overall: Math.max(40, Math.min(99, rating + Math.round((seededRoll(`${seed}:spread:${index}`) - 0.5) * 4))),
    position: (index < 5 ? roles[index] : (["D", "M", "A"] as const)[index % 3]) as FivePosition,
  });
  const players = pool.slice(0, 5 + FIVE_BENCH).map(player);
  return { name: aiClubNames[(level - 1) % aiClubNames.length], formation, starters: players.slice(0, 5), bench: players.slice(5), userId: null };
}

type NewMatch = { kind: "ai" | "friend" | "season"; home: FiveTeam; away: FiveTeam; controllerId: string; controllerSide: FiveSide; homeUserId: string; awayUserId: string | null; level: number | null; seasonId: string | null };

/** Planlegger kampen og starter klokka. Svarer med kamp-id-en, eller null hvis brukeren allerede har en kamp på gang. */
export async function createLiveMatch(input: NewMatch): Promise<string | null> {
  const data = planFiveMatch(randomUUID(), input.home, input.away, input.controllerSide);
  const { data: row, error } = await supabaseAdmin().from("five_matches").insert({
    kind: input.kind, status: "live", started_at: new Date().toISOString(), home_user_id: input.homeUserId, away_user_id: input.awayUserId, away_name: input.away.name,
    ai_level: input.level, home_score: 0, away_score: 0, events: data, coins: 0, controller_id: input.controllerId, controller_side: input.controllerSide, season_id: input.seasonId,
  }).select("id").single();
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(error.message);
  }
  return row.id as string;
}

function resultFor(score: { home: number; away: number }, side: FiveSide) {
  const mine = score[side]; const theirs = score[side === "home" ? "away" : "home"];
  return mine > theirs ? "win" : mine === theirs ? "draw" : "loss";
}

/**
 * Avgjør et stopp i kampen og lagrer det. Raden skrives bare hvis den ikke finnes fra før,
 * så et dobbelt klikk eller to faner kan aldri gi to utfall.
 */
export async function resolveShot(matchId: string, data: FiveMatchData, minute: number, pick: number | null): Promise<FiveShotResult | null> {
  const shot = (data.shots ?? []).find((entry) => entry.minute === minute);
  if (!shot) return null;
  const valid = pick !== null && Number.isInteger(pick) && pick >= 0 && pick < FIVE_SHOT_CELLS ? pick : null;
  const result = resolveFiveShot(data, shot, valid, [Math.random(), Math.random(), Math.random()]);
  const db = supabaseAdmin();
  await db.from("five_match_shots").upsert({ match_id: matchId, minute, side: shot.side, kind: shot.kind, shooter_cell: result.shooterCell, keeper_cell: result.keeperCell, outcome: result.outcome, resolved_at: new Date().toISOString() }, { onConflict: "match_id,minute", ignoreDuplicates: true });
  const { data: stored } = await db.from("five_match_shots").select("minute, side, shooter_cell, keeper_cell, outcome").eq("match_id", matchId).eq("minute", minute).maybeSingle();
  return stored ? { minute: stored.minute, side: stored.side, shooterCell: stored.shooter_cell, keeperCell: stored.keeper_cell, outcome: stored.outcome } : null;
}

/** Om valget på et stopp fortsatt er åpent, ut fra serverens klokke. Litt slingringsmonn for nettverket. */
export function shotChoiceOpen(data: FiveMatchData, startedAt: string, minute: number) {
  const clock = fiveClock(Date.now() - new Date(startedAt).getTime(), fiveShotMinutes(data));
  return clock.shotMinute === minute && clock.shotElapsedMs < FIVE_SHOT_CHOICE_MS + 1_500;
}

/**
 * Gjør opp kampen hvis klokka har gått ut. Stopp ingen rakk å velge på, avgjøres tilfeldig.
 * Svarer true når kampen er (eller allerede var) ferdig.
 */
export async function settleIfFinished(matchId: string): Promise<boolean> {
  const match = await getFiveMatch(matchId);
  if (!match?.data) return false;
  if (match.status === "completed") return true;
  const data = match.data;
  if (!match.startedAt || Date.now() - new Date(match.startedAt).getTime() < fiveDurationMs(fiveShotMinutes(data))) return false;
  const results: FiveShotResult[] = [];
  for (const shot of data.shots ?? []) {
    const existing = match.shots.find((entry) => entry.minute === shot.minute && entry.outcome);
    const result = existing ?? await resolveShot(matchId, data, shot.minute, null);
    if (result) results.push(result);
  }
  const score = fiveScore(data, results);
  const homeResult = resultFor(score, "home"); const awayResult = resultFor(score, "away");
  const rewardHome = match.kind === "ai" ? fiveAiReward(match.aiLevel ?? 1, homeResult) : match.kind === "friend" ? fiveFriendReward(homeResult) : fiveSeasonReward(homeResult);
  const rewardAway = match.kind === "season" ? fiveSeasonReward(awayResult) : 0;
  const { error } = await supabaseAdmin().rpc("settle_five_match", {
    target_match: matchId, score_home: score.home, score_away: score.away, reward_home: rewardHome, reward_away: rewardAway,
    stats_home: fiveCardStats(data, "home", results), stats_away: match.kind === "season" ? fiveCardStats(data, "away", results) : [],
  });
  if (error) throw new Error(error.message);
  return true;
}

/** En kamp som er ferdig på klokka, men aldri ble gjort opp (f.eks. fordi siden ble lukket), gjøres opp her. */
export async function settleStaleMatch(userId: string) {
  const live = await getLiveFiveMatchId(userId);
  if (live) await settleIfFinished(live);
}

