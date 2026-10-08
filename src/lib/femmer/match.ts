// Kampmotoren i Femmer. Åpent spill (2 × 20 minutter) planlegges på serveren i det kampen starter,
// og ligger fast i five_matches. Straffer og store sjanser er planlagt som stopp i kampen, men utfallet
// avgjøres først når den som spiller har valgt hjørne (som skytter) eller side (som keeper).
// Klokka regnes ut fra når kampen startet på serveren, så den kan ikke hoppes over.
// Planleggingen er deterministisk ut fra frøet: samme lag og samme frø gir samme kamp.

import { fiveFormations, fivePositionPenalty, FIVE_XP, isFiveFormation, type FiveFormation, type FivePosition, type FiveRole } from "./rules";

export type FivePlayer = { id: string; personId: string; name: string; slug: string; overall: number; position?: FivePosition | null; inform?: boolean };
export type FiveTeam = { name: string; formation: FiveFormation; starters: FivePlayer[]; bench: FivePlayer[]; userId: string | null };
export type FiveSide = "home" | "away";
export type FiveEvent =
  | { type: "goal"; minute: number; side: FiveSide; playerId: string; player: string; assistId: string | null; assist: string | null }
  | { type: "save"; minute: number; side: FiveSide; playerId: string; player: string; keeper: string | null }
  | { type: "post"; minute: number; side: FiveSide; playerId: string; player: string };
export type FiveShotKind = "penalty" | "chance";
/** Et planlagt stopp: `side` er laget som skyter. */
export type FiveShot = { minute: number; side: FiveSide; kind: FiveShotKind; takerId: string; taker: string; shooting: number; keeperId: string | null; keeper: string | null; keeping: number };
export type FiveShotResult = { minute: number; side: FiveSide; shooterCell: number | null; keeperCell: number | null; outcome: "goal" | "saved" | "missed" | null };
/**
 * Versjon 1 var de første kampene, som ble simulert ferdig uten valg. De har `score` og ingen `shots`.
 * Versjon 3 har taktikk: åpent spill regnes ut på nytt fra frøet med taktikkene som gjaldt hvert minutt
 * (se fivePlay), så `events` i en slik kamp er bare slik kampen ser ut uten taktikkbytter.
 * `controllerSide` er laget til den som spiller kampen og tar valgene. `msPerMinute` er tempoet kampen
 * ble spilt i; kamper fra før det fantes, gikk på FIVE_MS_PER_MINUTE.
 */
export type FiveMatchData = { version: 1 | 2 | 3; seed: string; home: FiveTeam; away: FiveTeam; events: FiveEvent[]; shots?: FiveShot[]; controllerSide?: FiveSide; msPerMinute?: number; score?: { home: number; away: number }; playerOfMatch?: string | null };

/** Taktikken et lag spiller med. Den som spiller bytter selv; motstanderen svarer på stillingen. */
export type FiveTactic = "balanced" | "attack" | "defend" | "press";
export const fiveTacticNames: FiveTactic[] = ["balanced", "attack", "defend", "press"];
export function isFiveTactic(value: unknown): value is FiveTactic {
  return typeof value === "string" && (fiveTacticNames as string[]).includes(value);
}
/** Et taktikkbytte, som gjelder fra og med `minute`. */
export type FiveTacticChange = { minute: number; side: FiveSide; tactic: FiveTactic };
/** Kampminutter man må vente mellom to taktikkbytter. */
export const FIVE_TACTIC_COOLDOWN = 5;

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

// ---------------------------------------------------------------------------
// Klokka
// ---------------------------------------------------------------------------

/** Tempoet i kamper fra før kampen ble vist på banen. */
export const FIVE_MS_PER_MINUTE = 450;
/** Tempoet i nye kamper: sakte nok til å se angrepene og bytte taktikk. */
export const FIVE_LIVE_MS_PER_MINUTE = 1_500;
export const FIVE_HALFTIME_MS = 3_000;
/** På et stopp: sju sekunder på å velge, tre på å se hvordan det gikk. */
export const FIVE_SHOT_CHOICE_MS = 7_000;
export const FIVE_SHOT_REVEAL_MS = 3_000;
export const FIVE_SHOT_MS = FIVE_SHOT_CHOICE_MS + FIVE_SHOT_REVEAL_MS;

export type FivePhase = "first_half" | "halftime" | "second_half" | "shot" | "full_time";
/** `minute` er minuttene som er spilt ferdig; `progress` (0–1) er hvor langt det neste har kommet. */
export type FiveClock = { phase: FivePhase; minute: number; progress: number; shotMinute: number | null; shotElapsedMs: number };

export function fiveMsPerMinute(match: Pick<FiveMatchData, "msPerMinute">) {
  return match.msPerMinute ?? FIVE_MS_PER_MINUTE;
}

/** Hvor kampen er etter `elapsed` millisekunder. Stoppene ligger fast fra avspark, så alle får samme svar. */
export function fiveClock(elapsed: number, shotMinutes: number[], msPerMinute = FIVE_MS_PER_MINUTE): FiveClock {
  let remaining = Math.max(0, elapsed);
  for (let minute = 1; minute <= FIVE_MATCH_MINUTES; minute += 1) {
    if (remaining < msPerMinute) return { phase: minute <= FIVE_HALF_MINUTES ? "first_half" : "second_half", minute: minute - 1, progress: remaining / msPerMinute, shotMinute: null, shotElapsedMs: 0 };
    remaining -= msPerMinute;
    if (shotMinutes.includes(minute)) {
      if (remaining < FIVE_SHOT_MS) return { phase: "shot", minute, progress: 0, shotMinute: minute, shotElapsedMs: remaining };
      remaining -= FIVE_SHOT_MS;
    }
    if (minute === FIVE_HALF_MINUTES) {
      if (remaining < FIVE_HALFTIME_MS) return { phase: "halftime", minute, progress: 0, shotMinute: null, shotElapsedMs: 0 };
      remaining -= FIVE_HALFTIME_MS;
    }
  }
  return { phase: "full_time", minute: FIVE_MATCH_MINUTES, progress: 0, shotMinute: null, shotElapsedMs: 0 };
}

export function fiveDurationMs(shotMinutes: number[], msPerMinute = FIVE_MS_PER_MINUTE) {
  return FIVE_MATCH_MINUTES * msPerMinute + FIVE_HALFTIME_MS + shotMinutes.length * FIVE_SHOT_MS;
}

// ---------------------------------------------------------------------------
// Lagstyrke
// ---------------------------------------------------------------------------

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

/** Spilleren på sin plass i kampen. `rating` er ratingen etter straffen for å spille utenfor posisjon. */
type Placed = FivePlayer & { role: FiveRole; bench: boolean; rating: number };

function placed(team: FiveTeam): Placed[] {
  const slots = fiveFormations[isFiveFormation(team.formation) ? team.formation : "1-2-1"];
  // Kamper fra før posisjonene fantes har ingen posisjon på kortene, og der teller den ikke.
  const penalty = (player: FivePlayer, role: FiveRole) => (player.position === undefined ? 0 : fivePositionPenalty(player.position, role));
  return [
    ...team.starters.map((player, index) => { const role = slots[index]?.role ?? "M"; return { ...player, role, bench: false, rating: player.overall - penalty(player, role) }; }),
    // En innbytter roterer inn på sin egen plass. Keepere på benken spiller ikke ute.
    ...team.bench.map((player) => { const role: FiveRole = player.position && player.position !== "GK" ? player.position : "M"; return { ...player, role, bench: true, rating: player.overall - (player.position === "GK" ? 15 : penalty(player, role)) }; }),
  ];
}

/** Ratingen hver spiller faktisk spiller på i kampen, etter posisjon. Vises i laguttaket på kampsiden. */
export function effectiveRatings(team: FiveTeam): Map<string, number> {
  return new Map(placed(team).map((player) => [player.id, player.rating]));
}

function unit(players: Placed[], weights: Record<FiveRole, number>, minus: number) {
  let total = 0; let weight = 0;
  for (const player of players.filter((entry) => !entry.bench)) {
    total += weights[player.role] * (player.rating - minus);
    weight += weights[player.role];
  }
  return weight > 0 ? total / weight : 50;
}

function weightedPick(players: Placed[], weights: Record<FiveRole, number>, roll: number, minute: number): Placed | null {
  const weightOf = (player: Placed) => (player.bench && minute <= FIVE_HALF_MINUTES ? 0 : weights[player.role] * (player.bench ? BENCH_SHARE : 1) * (0.6 + player.rating / 150));
  const total = players.reduce((sum, player) => sum + weightOf(player), 0);
  if (total <= 0) return null;
  let target = roll * total;
  for (const player of players) {
    target -= weightOf(player);
    if (target <= 0 && weightOf(player) > 0) return player;
  }
  return players.filter((player) => weightOf(player) > 0).at(-1) ?? null;
}

function keeperOf(players: Placed[]) {
  return players.find((player) => !player.bench && player.role === "GK") ?? null;
}

/** Sjansen for at et skudd i åpent spill går i mål: skytteren mot keeperen. */
export function fiveFinishChance(shooter: number, keeper: number) {
  return bounded(0.38 * Math.exp((shooter - keeper) * 0.015), 0.1, 0.75);
}

// ---------------------------------------------------------------------------
// Straffer og store sjanser
// ---------------------------------------------------------------------------

/** Målet er delt i 3 × 2 ruter: 0–2 oppe (venstre, midt, høyre), 3–5 nede. */
export const FIVE_SHOT_CELLS = 6;
const placement = [0.95, 0.72, 0.95, 0.9, 0.68, 0.9];

/** Sjansen for mål når den som spiller skyter mot en rute. Det er dette tallet som står på ruta. */
export function fiveCellChance(shot: Pick<FiveShot, "kind" | "shooting" | "keeping">, cell: number) {
  const base = shot.kind === "penalty" ? 0.82 : 0.52;
  return bounded(base * (placement[cell] ?? 0.8) * Math.exp((shot.shooting - shot.keeping) * 0.02), 0.05, 0.95);
}

/** Om en straffe/sjanse er den som spiller sin (skytter) eller motstanderens (da står man i mål). */
export function controllerShoots(match: FiveMatchData, shot: FiveShot) {
  return shot.side === (match.controllerSide ?? "home");
}

/**
 * Avgjør et stopp. `pick` er ruta den som spiller valgte (null når tiden gikk ut).
 * Som skytter: én trekning mot prosenten på ruta; bom på en rute er redning, ellers utenfor.
 * Som keeper: AI-skytteren velger en rute (oftest de beste). Gjetter man riktig rute, er det redning;
 * ellers går den inn med sjansen ruta har.
 */
export function resolveFiveShot(match: FiveMatchData, shot: FiveShot, pick: number | null, rolls: [number, number, number]): Omit<FiveShotResult, "minute" | "side"> {
  const [first, second, third] = rolls;
  if (controllerShoots(match, shot)) {
    const cell = pick ?? Math.floor(first * FIVE_SHOT_CELLS);
    const chance = fiveCellChance(shot, cell);
    if (second < chance) {
      const elsewhere = [0, 1, 2, 3, 4, 5].filter((entry) => entry !== cell);
      return { shooterCell: cell, keeperCell: elsewhere[Math.floor(third * elsewhere.length)], outcome: "goal" };
    }
    const saved = (second - chance) / (1 - chance) < 0.7;
    return { shooterCell: cell, keeperCell: saved ? cell : Math.floor(third * FIVE_SHOT_CELLS), outcome: saved ? "saved" : "missed" };
  }
  const weights = placement.map((value) => value * value);
  let target = first * weights.reduce((sum, value) => sum + value, 0);
  let shooterCell = FIVE_SHOT_CELLS - 1;
  for (let cell = 0; cell < FIVE_SHOT_CELLS; cell += 1) { target -= weights[cell]; if (target <= 0) { shooterCell = cell; break; } }
  const keeperCell = pick ?? Math.floor(third * FIVE_SHOT_CELLS);
  if (keeperCell === shooterCell) return { shooterCell, keeperCell, outcome: "saved" };
  return { shooterCell, keeperCell, outcome: second < Math.min(0.95, fiveCellChance(shot, shooterCell) * 1.15) ? "goal" : "missed" };
}

function planShots(seed: string, teams: Record<FiveSide, Placed[]>): FiveShot[] {
  const slots: { minute: number; kind: FiveShotKind }[] = [];
  const minuteFrom = (key: string) => { const minute = 3 + Math.floor(seededRoll(`${seed}:${key}:minute`) * 36); return minute === FIVE_HALF_MINUTES ? minute + 1 : minute; };
  if (seededRoll(`${seed}:penalty`) < 0.4) slots.push({ minute: minuteFrom("penalty"), kind: "penalty" });
  for (const index of [0, 1, 2]) if (seededRoll(`${seed}:chance:${index}`) < 0.4) slots.push({ minute: minuteFrom(`chance:${index}`), kind: "chance" });
  const used = new Set<number>();
  return slots.sort((first, second) => first.minute - second.minute).filter((slot) => (used.has(slot.minute) ? false : (used.add(slot.minute), true))).flatMap((slot) => {
    const side: FiveSide = seededRoll(`${seed}:${slot.minute}:shot:side`) < 0.5 ? "home" : "away";
    const opponent: FiveSide = side === "home" ? "away" : "home";
    const outfield = teams[side].filter((player) => player.role !== "GK" && (!player.bench || slot.minute > FIVE_HALF_MINUTES));
    // Straffen tas av den beste på banen; en stor sjanse faller på den som er der.
    const taker = slot.kind === "penalty" ? [...outfield].filter((player) => !player.bench).sort((first, second) => second.rating - first.rating || first.name.localeCompare(second.name))[0] : weightedPick(teams[side], scorerWeights, seededRoll(`${seed}:${slot.minute}:taker`), slot.minute);
    const keeper = keeperOf(teams[opponent]);
    return taker ? [{ minute: slot.minute, side, kind: slot.kind, takerId: taker.id, taker: taker.name, shooting: taker.rating, keeperId: keeper?.id ?? null, keeper: keeper?.name ?? null, keeping: keeper?.rating ?? 50 }] : [];
  });
}

// ---------------------------------------------------------------------------
// Planlegging
// ---------------------------------------------------------------------------

// Taktikken flytter ratingpoeng mellom angrep og forsvar. Press gir litt av begge, men laget blir
// slitent for hvert minutt det presser, og det tar ikke benken bort.
const tacticEdge: Record<FiveTactic, { attack: number; defence: number }> = {
  balanced: { attack: 0, defence: 0 },
  attack: { attack: 5, defence: -6 },
  defend: { attack: -6, defence: 6 },
  press: { attack: 3, defence: 3 },
};
const PRESS_FATIGUE = 0.15;

/** Hva laget uten noen som styrer det spiller med, ut fra stillingen før minuttet (`goalDiff` er egne mål minus motstanderens). */
export function fiveAiTactic(minute: number, goalDiff: number): FiveTactic {
  if (goalDiff >= 1 && minute > 30) return "defend";
  if (goalDiff <= -2 && minute > 10) return "attack";
  if (goalDiff <= -1 && minute > 24) return "attack";
  if (goalDiff <= -1 && minute > 14) return "press";
  return "balanced";
}

/** Taktikken den som spiller har valgt for et minutt: det siste byttet som gjelder fra før eller fra det minuttet. */
function chosenTactic(changes: FiveTacticChange[], side: FiveSide, minute: number): FiveTactic {
  let tactic: FiveTactic = "balanced"; let from = 0;
  for (const change of changes) if (change.side === side && change.minute <= minute && change.minute >= from) { tactic = change.tactic; from = change.minute; }
  return tactic;
}

/** Taktikkene i hvert minutt; indeks 0 er ubrukt. */
export type FiveTacticTimeline = Record<FiveSide, FiveTactic>[];

/**
 * Spiller det åpne spillet minutt for minutt. Hvert minutt trekkes fra frøet for seg, så et taktikkbytte
 * endrer bare minuttene etter at det gjelder. Laget uten noen som styrer det, svarer på stillingen, og
 * da teller straffer og sjanser som er avgjort (`results`).
 */
function openPlay(data: Pick<FiveMatchData, "seed" | "home" | "away" | "controllerSide">, shots: FiveShot[], changes: FiveTacticChange[], results: FiveShotResult[]) {
  const { seed } = data;
  const teams = { home: placed(data.home), away: placed(data.away) };
  const formations = { home: data.home.formation, away: data.away.formation };
  const benches = { home: data.home.bench.length, away: data.away.bench.length };
  const shotMinutes = new Set(shots.map((shot) => shot.minute));
  const controller = data.controllerSide ?? "home";
  const events: FiveEvent[] = [];
  const timeline: FiveTacticTimeline = [{ home: "balanced", away: "balanced" }];
  const score = { home: 0, away: 0 };
  const pressed = { home: 0, away: 0 };

  for (let minute = 1; minute <= FIVE_MATCH_MINUTES; minute += 1) {
    const tactics = {} as Record<FiveSide, FiveTactic>;
    for (const side of ["home", "away"] as const) {
      const opponent: FiveSide = side === "home" ? "away" : "home";
      tactics[side] = side === controller ? chosenTactic(changes, side, minute) : fiveAiTactic(minute, score[side] - score[opponent]);
      if (tactics[side] === "press") pressed[side] += 1;
    }
    timeline.push(tactics);
    // Minuttet med straffe eller stor sjanse har ingen andre hendelser, så stoppet står alene.
    if (shotMinutes.has(minute)) {
      const result = results.find((entry) => entry.minute === minute);
      if (result?.outcome === "goal") score[result.side] += 1;
      continue;
    }
    for (const side of ["home", "away"] as const) {
      const opponent: FiveSide = side === "home" ? "away" : "home";
      const tired = fatigue(minute, benches[side]) + pressed[side] * PRESS_FATIGUE;
      const opponentTired = fatigue(minute, benches[opponent]) + pressed[opponent] * PRESS_FATIGUE;
      const edge = unit(teams[side], attackWeights, tired) + tilt(formations[side]).attack + tacticEdge[tactics[side]].attack
        - unit(teams[opponent], defenceWeights, opponentTired) - tilt(formations[opponent]).defence - tacticEdge[tactics[opponent]].defence;
      const attemptRate = bounded(0.13 * Math.exp(edge * 0.04), 0.03, 0.3);
      if (seededRoll(`${seed}:${minute}:${side}:attempt`) >= attemptRate) continue;

      const shooter = weightedPick(teams[side], scorerWeights, seededRoll(`${seed}:${minute}:${side}:shooter`), minute);
      if (!shooter) continue;
      const keeper = keeperOf(teams[opponent]);
      const finish = seededRoll(`${seed}:${minute}:${side}:finish`);
      const scoring = fiveFinishChance(shooter.rating - tired, (keeper?.rating ?? 50) - opponentTired);
      if (finish < scoring) {
        const solo = seededRoll(`${seed}:${minute}:${side}:solo`) < 0.25;
        const assist = solo ? null : weightedPick(teams[side].filter((player) => player.id !== shooter.id), assistWeights, seededRoll(`${seed}:${minute}:${side}:assist`), minute);
        events.push({ type: "goal", minute, side, playerId: shooter.id, player: shooter.name, assistId: assist?.id ?? null, assist: assist?.name ?? null });
        score[side] += 1;
      } else if ((finish - scoring) / (1 - scoring) < 0.7) {
        events.push({ type: "save", minute, side, playerId: shooter.id, player: shooter.name, keeper: keeper?.name ?? null });
      } else {
        events.push({ type: "post", minute, side, playerId: shooter.id, player: shooter.name });
      }
    }
  }
  return { events, timeline };
}

export function planFiveMatch(seed: string, home: FiveTeam, away: FiveTeam, controllerSide: FiveSide = "home"): FiveMatchData {
  const shots = planShots(seed, { home: placed(home), away: placed(away) });
  const { events } = openPlay({ seed, home, away, controllerSide }, shots, [], []);
  return { version: 3, seed, home, away, events, shots, controllerSide, msPerMinute: FIVE_LIVE_MS_PER_MINUTE };
}

/**
 * Kampen slik den faktisk ble spilt med taktikkbyttene og stoppene som er avgjort. Eldre kamper uten
 * taktikk har hendelsene sine lagret og spilte balansert hele veien.
 */
export function fivePlay(match: FiveMatchData, changes: FiveTacticChange[], results: FiveShotResult[]): { match: FiveMatchData; timeline: FiveTacticTimeline } {
  if (match.version !== 3) return { match, timeline: Array.from({ length: FIVE_MATCH_MINUTES + 1 }, () => ({ home: "balanced", away: "balanced" })) };
  const { events, timeline } = openPlay(match, match.shots ?? [], changes, results);
  return { match: { ...match, events }, timeline };
}

// ---------------------------------------------------------------------------
// Stilling og oppgjør
// ---------------------------------------------------------------------------

export function fiveShotMinutes(match: FiveMatchData) {
  return (match.shots ?? []).map((shot) => shot.minute);
}

/** Stillingen etter `minute`, med straffene og sjansene som er avgjort så langt. */
export function fiveScore(match: FiveMatchData, results: FiveShotResult[], minute = FIVE_MATCH_MINUTES) {
  const score = { home: 0, away: 0 };
  for (const event of match.events) if (event.type === "goal" && event.minute <= minute) score[event.side] += 1;
  for (const result of results) if (result.outcome === "goal" && result.minute <= minute) score[result.side] += 1;
  return score;
}

/** Mål og målgivende per spiller, inkludert straffer og sjanser som gikk inn. */
function contributions(match: FiveMatchData, results: FiveShotResult[]) {
  const goals = new Map<string, number>(); const assists = new Map<string, number>();
  for (const event of match.events) {
    if (event.type !== "goal") continue;
    goals.set(event.playerId, (goals.get(event.playerId) ?? 0) + 1);
    if (event.assistId) assists.set(event.assistId, (assists.get(event.assistId) ?? 0) + 1);
  }
  for (const shot of match.shots ?? []) {
    if (results.find((result) => result.minute === shot.minute)?.outcome === "goal") goals.set(shot.takerId, (goals.get(shot.takerId) ?? 0) + 1);
  }
  return { goals, assists };
}

export function playerOfMatch(match: FiveMatchData, results: FiveShotResult[]): string | null {
  if (match.version === 1) return match.playerOfMatch ?? null;
  const { goals, assists } = contributions(match, results);
  const points = new Map<string, number>();
  for (const [id, count] of goals) points.set(id, (points.get(id) ?? 0) + count * 3);
  for (const [id, count] of assists) points.set(id, (points.get(id) ?? 0) + count);
  const saves = [...match.events.filter((event) => event.type === "save").map((event) => (event.type === "save" ? event.keeper : null)), ...(match.shots ?? []).filter((shot) => results.find((result) => result.minute === shot.minute)?.outcome === "saved").map((shot) => shot.keeper)];
  const everyone = [...match.home.starters, ...match.home.bench, ...match.away.starters, ...match.away.bench];
  for (const name of saves) { const keeper = everyone.find((player) => player.name === name); if (keeper) points.set(keeper.id, (points.get(keeper.id) ?? 0) + 1); }
  return [...everyone].sort((first, second) => (points.get(second.id) ?? 0) - (points.get(first.id) ?? 0) || second.overall - first.overall || first.name.localeCompare(second.name))[0]?.name ?? null;
}

/** Erfaringen kortene på én side får av kampen, slik settle_five_match vil ha den. */
export function fiveCardStats(match: FiveMatchData, side: FiveSide, results: FiveShotResult[]) {
  const score = fiveScore(match, results);
  const won = side === "home" ? score.home > score.away : score.away > score.home;
  const { goals, assists } = contributions(match, results);
  const team = match[side];
  const stat = (player: FivePlayer, base: number) => {
    const scored = goals.get(player.id) ?? 0; const assisted = assists.get(player.id) ?? 0;
    return { id: player.id, goals: scored, assists: assisted, xp: base + scored * FIVE_XP.goal + assisted * FIVE_XP.assist + (won ? FIVE_XP.win : 0) };
  };
  return [...team.starters.map((player) => stat(player, FIVE_XP.starter)), ...team.bench.map((player) => stat(player, FIVE_XP.bench))];
}

export function isFiveMatchData(value: unknown): value is FiveMatchData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (data.version === 1 || data.version === 2) && Array.isArray(data.events) && typeof data.home === "object" && typeof data.away === "object";
}
