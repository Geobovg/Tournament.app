// Kampmotoren i Femmer. Hele kampen (2 × 20 minutter) simuleres på serveren i det man trykker
// «Spill», og lagres ferdig i five_matches. Nettleseren spiller den bare av etterpå.
// Motoren er deterministisk ut fra frøet, så samme lag og samme frø gir alltid samme kamp.

import { fiveFormations, FIVE_XP, isFiveFormation, type FiveFormation, type FiveRole } from "./rules";

export type FivePlayer = { id: string; personId: string; name: string; slug: string; overall: number };
export type FiveTeam = { name: string; formation: FiveFormation; starters: FivePlayer[]; bench: FivePlayer[]; userId: string | null };
export type FiveSide = "home" | "away";
export type FiveEvent =
  | { type: "goal"; minute: number; side: FiveSide; playerId: string; player: string; assistId: string | null; assist: string | null }
  | { type: "save"; minute: number; side: FiveSide; playerId: string; player: string; keeper: string | null }
  | { type: "post"; minute: number; side: FiveSide; playerId: string; player: string };
export type FiveMatchData = { version: 1; seed: string; home: FiveTeam; away: FiveTeam; events: FiveEvent[]; score: { home: number; away: number }; playerOfMatch: string | null };

export const FIVE_HALF_MINUTES = 20;
export const FIVE_MATCH_MINUTES = 40;

function bounded(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

/** Et tall mellom 0 og 1 fra en tekst. Samme tekst gir alltid samme tall. */
export function seededRoll(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  return (hash >>> 0) / 4_294_967_296;
}

export function teamRating(players: { overall: number }[]): number | null {
  return players.length ? Math.round(players.reduce((sum, player) => sum + player.overall, 0) / players.length) : null;
}

// Hvor mye hver rolle teller i angrep og forsvar. Keeperen veier tyngst bakover.
const attackWeights: Record<FiveRole, number> = { GK: 0, D: 0.7, M: 2, A: 3 };
const defenceWeights: Record<FiveRole, number> = { GK: 3, D: 2.5, M: 1.2, A: 0.3 };
const scorerWeights: Record<FiveRole, number> = { GK: 0.1, D: 1, M: 2.5, A: 5 };
const assistWeights: Record<FiveRole, number> = { GK: 0.5, D: 1.5, M: 4, A: 3 };
/** Benken roterer inn fra andre omgang, og spillerne der får en litt mindre andel av sjansene. */
const BENCH_SHARE = 0.4;

/**
 * Femmerfotball er slitsomt. Fra andre omgang mister de som har spilt hele tiden litt, og en full
 * benk som kan rotere inn tar det meste av slitasjen bort. Derfor betyr benken noe.
 */
export function fatigue(minute: number, benchCount: number) {
  if (minute <= FIVE_HALF_MINUTES) return 0;
  const cover = Math.min(benchCount, 5) / 5 * 0.8;
  return (minute - FIVE_HALF_MINUTES) * 0.25 * (1 - cover);
}

/** Formasjonen vipper laget litt fram eller tilbake, i ratingpoeng. */
function tilt(formation: FiveFormation) {
  const roles = fiveFormations[formation].map((slot) => slot.role);
  const attackers = roles.filter((role) => role === "A").length;
  const defenders = roles.filter((role) => role === "D").length;
  return { attack: (attackers - defenders) * 0.8, defence: (defenders - attackers) * 0.8 };
}

type Placed = FivePlayer & { role: FiveRole; bench: boolean };

function placed(team: FiveTeam): Placed[] {
  const slots = fiveFormations[isFiveFormation(team.formation) ? team.formation : "1-2-1"];
  return [
    ...team.starters.map((player, index) => ({ ...player, role: slots[index]?.role ?? "M", bench: false })),
    ...team.bench.map((player) => ({ ...player, role: "M" as FiveRole, bench: true })),
  ];
}

function unit(players: Placed[], weights: Record<FiveRole, number>, minus: number) {
  let total = 0; let weight = 0;
  for (const player of players.filter((entry) => !entry.bench)) {
    total += weights[player.role] * (player.overall - minus);
    weight += weights[player.role];
  }
  return weight > 0 ? total / weight : 50;
}

function weightedPick(players: Placed[], weights: Record<FiveRole, number>, roll: number, minute: number): Placed | null {
  const weightOf = (player: Placed) => (player.bench && minute <= FIVE_HALF_MINUTES ? 0 : weights[player.role] * (player.bench ? BENCH_SHARE : 1) * (0.6 + player.overall / 150));
  const total = players.reduce((sum, player) => sum + weightOf(player), 0);
  if (total <= 0) return null;
  let target = roll * total;
  for (const player of players) {
    target -= weightOf(player);
    if (target <= 0 && weightOf(player) > 0) return player;
  }
  return players.filter((player) => weightOf(player) > 0).at(-1) ?? null;
}

/** Sjansen for at et skudd går i mål: skytteren mot keeperen. */
export function fiveFinishChance(shooter: number, keeper: number) {
  return bounded(0.38 * Math.exp((shooter - keeper) * 0.015), 0.1, 0.75);
}

export function simulateFiveMatch(seed: string, home: FiveTeam, away: FiveTeam): FiveMatchData {
  const teams = { home: placed(home), away: placed(away) };
  const formations = { home: home.formation, away: away.formation };
  const benches = { home: home.bench.length, away: away.bench.length };
  const events: FiveEvent[] = [];
  const score = { home: 0, away: 0 };

  for (let minute = 1; minute <= FIVE_MATCH_MINUTES; minute += 1) {
    for (const side of ["home", "away"] as const) {
      const opponent: FiveSide = side === "home" ? "away" : "home";
      const tired = fatigue(minute, benches[side]);
      const opponentTired = fatigue(minute, benches[opponent]);
      const edge = unit(teams[side], attackWeights, tired) + tilt(formations[side]).attack - unit(teams[opponent], defenceWeights, opponentTired) - tilt(formations[opponent]).defence;
      const attemptRate = bounded(0.14 * Math.exp(edge * 0.04), 0.03, 0.32);
      if (seededRoll(`${seed}:${minute}:${side}:attempt`) >= attemptRate) continue;

      const shooter = weightedPick(teams[side], scorerWeights, seededRoll(`${seed}:${minute}:${side}:shooter`), minute);
      if (!shooter) continue;
      const keeper = teams[opponent].find((player) => !player.bench && player.role === "GK") ?? null;
      const keeperRating = (keeper?.overall ?? 50) - opponentTired;
      const finish = seededRoll(`${seed}:${minute}:${side}:finish`);
      const scoring = fiveFinishChance(shooter.overall - tired, keeperRating);
      if (finish < scoring) {
        const solo = seededRoll(`${seed}:${minute}:${side}:solo`) < 0.25;
        const assist = solo ? null : weightedPick(teams[side].filter((player) => player.id !== shooter.id), assistWeights, seededRoll(`${seed}:${minute}:${side}:assist`), minute);
        score[side] += 1;
        events.push({ type: "goal", minute, side, playerId: shooter.id, player: shooter.name, assistId: assist?.id ?? null, assist: assist?.name ?? null });
      } else if ((finish - scoring) / (1 - scoring) < 0.7) {
        events.push({ type: "save", minute, side, playerId: shooter.id, player: shooter.name, keeper: keeper?.name ?? null });
      } else {
        events.push({ type: "post", minute, side, playerId: shooter.id, player: shooter.name });
      }
    }
  }

  const goals = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "goal") continue;
    goals.set(event.playerId, (goals.get(event.playerId) ?? 0) + 3);
    if (event.assistId) goals.set(event.assistId, (goals.get(event.assistId) ?? 0) + 1);
  }
  for (const event of events) if (event.type === "save" && event.keeper) {
    const keeper = [...teams.home, ...teams.away].find((player) => player.name === event.keeper && player.role === "GK");
    if (keeper) goals.set(keeper.id, (goals.get(keeper.id) ?? 0) + 1);
  }
  const everyone = [...teams.home, ...teams.away];
  const best = [...everyone].sort((first, second) => (goals.get(second.id) ?? 0) - (goals.get(first.id) ?? 0) || second.overall - first.overall || first.name.localeCompare(second.name))[0];

  return { version: 1, seed, home, away, events, score, playerOfMatch: best?.name ?? null };
}

/** Erfaringen hjemmelagets kort får av kampen, slik record_five_match vil ha den. */
export function fiveCardStats(match: FiveMatchData) {
  const won = match.score.home > match.score.away;
  const goals = new Map<string, number>(); const assists = new Map<string, number>();
  for (const event of match.events) {
    if (event.type !== "goal" || event.side !== "home") continue;
    goals.set(event.playerId, (goals.get(event.playerId) ?? 0) + 1);
    if (event.assistId) assists.set(event.assistId, (assists.get(event.assistId) ?? 0) + 1);
  }
  const stat = (player: FivePlayer, base: number) => {
    const scored = goals.get(player.id) ?? 0; const assisted = assists.get(player.id) ?? 0;
    return { id: player.id, goals: scored, assists: assisted, xp: base + scored * FIVE_XP.goal + assisted * FIVE_XP.assist + (won ? FIVE_XP.win : 0) };
  };
  return [...match.home.starters.map((player) => stat(player, FIVE_XP.starter)), ...match.home.bench.map((player) => stat(player, FIVE_XP.bench))];
}

export function isFiveMatchData(value: unknown): value is FiveMatchData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return data.version === 1 && Array.isArray(data.events) && typeof data.home === "object" && typeof data.away === "object";
}
