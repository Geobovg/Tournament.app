export type ManagerPlayerSnapshot = {
  id: string;
  name: string;
  position: string;
  overall: number;
  /** Katalogdata for spillerkortet i kampbildet. Academy-kort har ingen. */
  slug?: string | null;
  club?: string | null;
  accent?: string | null;
  /** Avgjør hvem som tar straffen og hvor mange hjørner han tør sikte på. */
  shooting?: number | null;
};
export type ManagerTeamSnapshot = { userId: string; formation: string; starters: ManagerPlayerSnapshot[]; bench: ManagerPlayerSnapshot[] };
export type ManagerKickoffEvent = { type: "kickoff"; version: 1 | 2 | 3; home: ManagerTeamSnapshot; away: ManagerTeamSnapshot };
export type MatchSide = "home" | "away";
export type ManagerSubstitutionEvent = { type: "substitution"; side: MatchSide; outId: string; inId: string; minute: number };
export type ManagerFullTimeEvent = { type: "full_time"; minute: 90; homeScore: number; awayScore: number };
export type TimelineGoal = { type: "goal"; minute: number; side: MatchSide; scorer: string; scorerId?: string; assist?: string | null; assistId?: string | null };
export type TimelineCard = { type: "card"; minute: number; side: MatchSide; card: "yellow" | "red"; player: string; playerId: string };
export type TimelineChance = { type: "chance"; minute: number; side: MatchSide; outcome: "post" | "save"; player: string; playerId: string };
export type ShotKind = "penalty" | "chance";
/** En planlagt sjanse spilleren selv skyter. Utfallet lagres i career_match_shots, ikke her. */
export type TimelineShot = { type: "shot"; minute: number; side: MatchSide; kind: ShotKind; takerId: string; taker: string; options: number[] };
export type TimelineEvent = TimelineGoal | TimelineCard | TimelineChance | ManagerSubstitutionEvent | TimelineShot;
export type ManagerMatchEvent = ManagerKickoffEvent | TimelineEvent | ManagerFullTimeEvent;

/** Raden fra career_match_shots: hva de to faktisk valgte, og hvordan det gikk. */
export type ShotResult = { minute: number; kind: ShotKind; side: MatchSide; shooterCell: number | null; keeperCell: number | null; outcome: "goal" | "saved" | "missed" | null };

export type ManagerMatchReport = {
  home: { strength: number; possession: number; shots: number; onTarget: number };
  away: { strength: number; possession: number; shots: number; onTarget: number };
  playerOfMatch: string;
};

// ---------------------------------------------------------------------------
// Kampklokke
// ---------------------------------------------------------------------------

/** 90 kampminutter spilles på to ganger 60 sekunder. */
export const HALF_MS = 60_000;
export const HALF_MINUTES = 45;
export const MS_PER_MINUTE = HALF_MS / HALF_MINUTES;
/** Kort pause med statistikk fra første omgang. */
export const HALFTIME_MS = 5_000;
/** Vinduet på 70′ der man kan ta imot bytteforslagene. */
export const SUB_WINDOW_MINUTE = 70;
export const SUB_WINDOW_MS = 10_000;
/** Et straffespark/en stor sjanse: 6 sekunder på å velge, 4 på å se hvordan det gikk. */
export const SHOT_CHOICE_MS = 6_000;
export const SHOT_REVEAL_MS = 4_000;
export const SHOT_MS = SHOT_CHOICE_MS + SHOT_REVEAL_MS;

export type MatchPhase = "first_half" | "halftime" | "second_half" | "substitutions" | "shot" | "full_time";
export type MatchClock = { phase: MatchPhase; minute: number; remainingMs: number; shotMinute: number | null; shotElapsedMs: number };

type Stoppage = { minute: number; ms: number; phase: MatchPhase };

function stoppagesFor(shotMinutes: number[]): Stoppage[] {
  return [
    { minute: HALF_MINUTES, ms: HALFTIME_MS, phase: "halftime" as const },
    { minute: SUB_WINDOW_MINUTE, ms: SUB_WINDOW_MS, phase: "substitutions" as const },
    ...shotMinutes.map((minute) => ({ minute, ms: SHOT_MS, phase: "shot" as const })),
  ].sort((first, second) => first.minute - second.minute);
}

/**
 * Klokka går aldri bakover og henger aldri: den regnes ut fra hvor mye tid som har gått,
 * minutt for minutt, med stoppene lagt inn på faste steder. Fordi alle stoppene er kjent
 * ved avspark, kommer begge klientene fram til nøyaktig samme minutt uten å snakke sammen.
 */
export function matchClock(elapsedMs: number, shotMinutes: number[] = []): MatchClock {
  const stoppages = stoppagesFor(shotMinutes);
  let remaining = Math.max(0, elapsedMs);

  for (let minute = 1; minute <= 90; minute += 1) {
    if (remaining < MS_PER_MINUTE) {
      return { phase: minute <= HALF_MINUTES ? "first_half" : "second_half", minute: minute - 1, remainingMs: msUntilBreak(minute, remaining, stoppages), shotMinute: null, shotElapsedMs: 0 };
    }
    remaining -= MS_PER_MINUTE;

    for (const stoppage of stoppages.filter((entry) => entry.minute === minute)) {
      if (remaining < stoppage.ms) {
        return { phase: stoppage.phase, minute, remainingMs: stoppage.ms - remaining, shotMinute: stoppage.phase === "shot" ? minute : null, shotElapsedMs: stoppage.phase === "shot" ? remaining : 0 };
      }
      remaining -= stoppage.ms;
    }
  }

  return { phase: "full_time", minute: 90, remainingMs: 0, shotMinute: null, shotElapsedMs: 0 };
}

/** Sekundene som er igjen til neste stopp, slik nedtellingen viser noe meningsfylt. */
function msUntilBreak(minute: number, intoMinute: number, stoppages: Stoppage[]): number {
  const next = stoppages.find((entry) => entry.minute >= minute)?.minute ?? 90;
  return (next - minute) * MS_PER_MINUTE + (MS_PER_MINUTE - intoMinute);
}

/** Hele kampens lengde i sanntid, inkludert pause, byttevindu og straffer. */
export function plannedDurationMs(shotMinutes: number[] = []): number {
  return 90 * MS_PER_MINUTE + HALFTIME_MS + SUB_WINDOW_MS + shotMinutes.length * SHOT_MS;
}

// ---------------------------------------------------------------------------
// Hendelser ut av den lagrede kampen
// ---------------------------------------------------------------------------

function isPlayer(value: unknown): value is ManagerPlayerSnapshot {
  if (!value || typeof value !== "object") return false;
  const player = value as Record<string, unknown>;
  return typeof player.id === "string" && typeof player.name === "string" && typeof player.position === "string" && typeof player.overall === "number";
}

function isTeam(value: unknown): value is ManagerTeamSnapshot {
  if (!value || typeof value !== "object") return false;
  const team = value as Record<string, unknown>;
  return typeof team.userId === "string" && typeof team.formation === "string" && Array.isArray(team.starters) && team.starters.every(isPlayer) && Array.isArray(team.bench) && team.bench.every(isPlayer);
}

export function getManagerKickoff(events: unknown): ManagerKickoffEvent | null {
  if (!Array.isArray(events)) return null;
  const kickoff = events.find((event) => event && typeof event === "object" && (event as { type?: unknown }).type === "kickoff") as Record<string, unknown> | undefined;
  if (!kickoff) return null;
  // Eldre kamper ligger lagret som versjon 1 og 2, uten katalogdata og skuddstat.
  const known = kickoff.version === 1 || kickoff.version === 2 || kickoff.version === 3;
  return known && isTeam(kickoff.home) && isTeam(kickoff.away) ? (kickoff as ManagerKickoffEvent) : null;
}

export function getManagerSubstitutions(events: unknown): ManagerSubstitutionEvent[] {
  if (!Array.isArray(events)) return [];
  return events
    .filter((event): event is Record<string, unknown> => Boolean(event) && typeof event === "object" && (event as Record<string, unknown>).type === "substitution" && ((event as Record<string, unknown>).side === "home" || (event as Record<string, unknown>).side === "away") && typeof (event as Record<string, unknown>).outId === "string" && typeof (event as Record<string, unknown>).inId === "string")
    .map((event) => ({
      type: "substitution",
      side: event.side as MatchSide,
      outId: event.outId as string,
      inId: event.inId as string,
      minute: Number.isInteger(event.minute) ? (event.minute as number) : SUB_WINDOW_MINUTE,
    }));
}

function isTimelineGoal(value: unknown): value is TimelineGoal {
  if (!value || typeof value !== "object") return false;
  const goal = value as Record<string, unknown>;
  return goal.type === "goal" && Number.isInteger(goal.minute) && Number(goal.minute) >= 1 && Number(goal.minute) <= 90 && (goal.side === "home" || goal.side === "away") && typeof goal.scorer === "string";
}

function isTimelineCard(value: unknown): value is TimelineCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Record<string, unknown>;
  return card.type === "card" && Number.isInteger(card.minute) && (card.side === "home" || card.side === "away") && (card.card === "yellow" || card.card === "red") && typeof card.player === "string";
}

function isTimelineChance(value: unknown): value is TimelineChance {
  if (!value || typeof value !== "object") return false;
  const chance = value as Record<string, unknown>;
  return chance.type === "chance" && Number.isInteger(chance.minute) && (chance.side === "home" || chance.side === "away") && (chance.outcome === "post" || chance.outcome === "save") && typeof chance.player === "string";
}

function isTimelineShot(value: unknown): value is TimelineShot {
  if (!value || typeof value !== "object") return false;
  const shot = value as Record<string, unknown>;
  return shot.type === "shot" && Number.isInteger(shot.minute) && (shot.side === "home" || shot.side === "away") && (shot.kind === "penalty" || shot.kind === "chance") && typeof shot.taker === "string" && Array.isArray(shot.options);
}

const eventOrder: Record<TimelineEvent["type"], number> = { goal: 0, shot: 1, card: 2, chance: 3, substitution: 4 };

function byMinute(first: TimelineEvent, second: TimelineEvent) {
  return first.minute - second.minute || eventOrder[first.type] - eventOrder[second.type] || first.side.localeCompare(second.side);
}

export function getManagerGoals(events: unknown): TimelineGoal[] {
  if (!Array.isArray(events)) return [];
  return events.filter(isTimelineGoal).sort((first, second) => first.minute - second.minute || first.side.localeCompare(second.side));
}

export function getManagerShots(events: unknown): TimelineShot[] {
  if (!Array.isArray(events)) return [];
  return events.filter(isTimelineShot).sort((first, second) => first.minute - second.minute);
}

/** Minuttene kampen stopper for et straffespark eller en stor sjanse. */
export function shotMinutesOf(events: unknown): number[] {
  return getManagerShots(events).map((shot) => shot.minute);
}

/** Alle hendelsene kampbildet viser, i den rekkefølgen de skjedde. */
export function getManagerTimeline(events: unknown): TimelineEvent[] {
  if (!Array.isArray(events)) return [];
  const timeline: TimelineEvent[] = [
    ...events.filter(isTimelineGoal),
    ...events.filter(isTimelineCard),
    ...events.filter(isTimelineChance),
    ...getManagerShots(events),
    ...getManagerSubstitutions(events),
  ];
  return timeline.sort(byMinute);
}

export function teamAfterSubstitutions(events: unknown, side: MatchSide): ManagerTeamSnapshot | null {
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return null;
  return lineupAtMinute(kickoff[side], getManagerSubstitutions(events).filter((event) => event.side === side), 91);
}

/** Laget slik det så ut i starten av `minute`, altså etter bytter gjort tidligere enn dette minuttet. */
function lineupAtMinute(team: ManagerTeamSnapshot, substitutions: ManagerSubstitutionEvent[], minute: number): ManagerTeamSnapshot {
  const starters = [...team.starters];
  const bench = [...team.bench];
  for (const substitution of substitutions.filter((event) => event.minute < minute).sort((first, second) => first.minute - second.minute)) {
    const starterIndex = starters.findIndex((player) => player.id === substitution.outId);
    const benchIndex = bench.findIndex((player) => player.id === substitution.inId);
    if (starterIndex < 0 || benchIndex < 0) continue;
    starters[starterIndex] = bench[benchIndex];
    bench.splice(benchIndex, 1);
  }
  return { ...team, starters, bench };
}

export function averageOverall(team: ManagerTeamSnapshot | null): number {
  if (!team || team.starters.length !== 11) return 60;
  return team.starters.reduce((total, player) => total + player.overall, 0) / team.starters.length;
}

function numberFromSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  return (hash >>> 0) / 4_294_967_296;
}

function bounded(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function shootingOf(player: ManagerPlayerSnapshot): number {
  return typeof player.shooting === "number" && player.shooting > 0 ? player.shooting : player.overall;
}

// ---------------------------------------------------------------------------
// Slitne bein
// ---------------------------------------------------------------------------

/** Fra 70′ tynges den som har gått hele kampen, så et bytte med friske bein betyr noe ekte. */
export const FATIGUE_FROM_MINUTE = 70;
export const MAX_FATIGUE = 7;

/**
 * Slitenheten bygger seg opp jevnt fra 70′ i stedet for å slå inn som et hopp, og rammer bare
 * den som har vært på banen lenge – en innbytter har friske bein resten av kampen.
 */
export function fatigueAt(minuteOn: number, minute: number): number {
  if (minute < FATIGUE_FROM_MINUTE || minute - minuteOn < 55) return 0;
  return bounded((minute - FATIGUE_FROM_MINUTE) * 0.35, 0, MAX_FATIGUE);
}

/** Minuttet hver spiller kom på banen, slik slitenheten kan regnes ut per spiller. */
function minutesOnPitch(team: ManagerTeamSnapshot, substitutions: ManagerSubstitutionEvent[]): Map<string, number> {
  const onPitch = new Map<string, number>(team.starters.map((player) => [player.id, 0]));
  for (const substitution of substitutions) onPitch.set(substitution.inId, substitution.minute);
  return onPitch;
}

/** Et rødt kort koster laget mer enn spillerens egen rating, derfor et fast tillegg per mann mindre. */
function teamStrength(players: ManagerPlayerSnapshot[], onPitch: Map<string, number>, minute: number): number {
  if (players.length === 0) return 40;
  const total = players.reduce((sum, player) => sum + player.overall - fatigueAt(onPitch.get(player.id) ?? 0, minute), 0);
  return total / players.length - Math.max(0, 11 - players.length) * 7;
}

// ---------------------------------------------------------------------------
// Skudd-rutenettet
// ---------------------------------------------------------------------------

export const SHOT_COLUMNS = 4;
export const SHOT_ROWS = 3;
export const SHOT_CELLS = SHOT_COLUMNS * SHOT_ROWS;

/**
 * Rekkefølgen cellene låses opp i: de enkleste å treffe først. En spiller med svak skuddstat
 * får bare de midtre, trygge plasseringene, mens en god avslutter også tør sikte i krysset.
 */
const UNLOCK_ORDER = [9, 10, 5, 6, 8, 11, 4, 7, 1, 2, 0, 3];

/** Hvor vanskelig plasseringen er å redde når keeper gjetter feil. */
const PLACEMENT: Record<number, number> = {
  0: 1, 3: 1,
  1: 0.9, 2: 0.9,
  4: 0.93, 7: 0.93,
  5: 0.8, 6: 0.8,
  8: 0.97, 11: 0.97,
  9: 0.85, 10: 0.85,
};

export function shotOptionCount(shooting: number): number {
  if (shooting < 65) return 3;
  if (shooting < 72) return 4;
  if (shooting < 78) return 5;
  if (shooting < 84) return 6;
  if (shooting < 89) return 7;
  if (shooting < 93) return 8;
  return 9;
}

export function shotOptions(shooting: number): number[] {
  return UNLOCK_ORDER.slice(0, shotOptionCount(shooting)).sort((first, second) => first - second);
}

/** Sjansen for mål i en gitt rute, gitt at keeperen ikke gjettet riktig. */
export function cellGoalChance(shooting: number, kind: ShotKind, cell: number): number {
  // Kalibrert mot ekte straffer: en god avslutter setter rundt tre av fire når keeperen gjetter
  // feil, en svak under halvparten – og han har dessuten færre ruter å gjemme seg i.
  const base = kind === "penalty"
    ? bounded(0.74 + (shooting - 55) * 0.0062, 0.6, 0.97)
    : bounded(0.42 + (shooting - 55) * 0.004, 0.28, 0.8);
  return bounded(base * (PLACEMENT[cell] ?? 0.85), 0.05, 0.97);
}

/**
 * Utfallet regnes ut likt hos begge managerne: samme kamp, samme minutt og samme to valg
 * gir alltid samme svar, så ingen av dem ser et annet resultat enn den andre.
 */
export function resolveShot(matchId: string, shot: TimelineShot, shooting: number, shooterCell: number, keeperCell: number | null): "goal" | "saved" | "missed" {
  if (shot.kind === "penalty" && keeperCell !== null && keeperCell === shooterCell) return "saved";
  const roll = numberFromSeed(`${matchId}:${shot.minute}:${shot.side}:shot:${shooterCell}:${keeperCell ?? "none"}`);
  return roll < cellGoalChance(shooting, shot.kind, shooterCell) ? "goal" : "missed";
}

/** Et valg for den som ikke rakk å trykke innen tiden gikk ut. */
export function autoShotCell(matchId: string, shot: TimelineShot, role: "shooter" | "keeper"): number {
  const roll = numberFromSeed(`${matchId}:${shot.minute}:${shot.side}:auto:${role}`);
  return shot.options[Math.min(shot.options.length - 1, Math.floor(roll * shot.options.length))];
}

// ---------------------------------------------------------------------------
// Simuleringen
// ---------------------------------------------------------------------------

const scorerWeights: Record<string, number> = { ST: 10, LW: 7, RW: 7, CAM: 6, CM: 3.4, CDM: 1.4, LB: 1, RB: 1, CB: 1.3, GK: 0 };
const assistWeights: Record<string, number> = { CAM: 9, LW: 8, RW: 8, CM: 6, ST: 4, LB: 3.6, RB: 3.6, CDM: 2.4, CB: 1, GK: 0.3 };
// Flatere enn de andre vektene med vilje: er den for skjev, plukkes den samme forsvarsspilleren
// gang på gang og andregule kort – altså røde – blir langt vanligere enn i en ekte kamp.
const cardWeights: Record<string, number> = { CDM: 4, CB: 3.6, CM: 3.2, LB: 3, RB: 3, CAM: 2.2, ST: 2.2, LW: 2, RW: 2, GK: 0.8 };

function weightedPick(players: ManagerPlayerSnapshot[], weights: Record<string, number>, roll: number, damp?: (player: ManagerPlayerSnapshot) => number): ManagerPlayerSnapshot | null {
  if (players.length === 0) return null;
  const weightOf = (player: ManagerPlayerSnapshot) => Math.max(0, weights[player.position] ?? 2) * (0.6 + player.overall / 150) * (damp?.(player) ?? 1);
  const total = players.reduce((sum, player) => sum + weightOf(player), 0);
  if (total <= 0) return players[0];
  let target = roll * total;
  for (const player of players) {
    target -= weightOf(player);
    if (target <= 0) return player;
  }
  return players[players.length - 1];
}

const BASE_GOAL_RATE = 0.017;
const BASE_CHANCE_RATE = 0.035;
const BASE_YELLOW_RATE = 0.021;
const BASE_RED_RATE = 0.0004;
/** En spiller med gult kort tar færre sjanser, så han blir sjeldnere plukket til det neste. */
const BOOKED_DAMPING = 0.3;

/**
 * Straffespark og store sjanser plasseres ut fra kamp-id alene – aldri ut fra laguttak eller
 * hvordan kampen står. Det er med vilje: minuttene kampen stopper på må ligge fast fra avspark,
 * ellers ville et bytte flyttet klokka under beina på den som ser.
 */
export function plannedShotSlots(matchId: string): { minute: number; kind: ShotKind }[] {
  const slots: { minute: number; kind: ShotKind }[] = [];
  if (numberFromSeed(`${matchId}:penalty:awarded`) < 0.4) {
    slots.push({ minute: 8 + Math.floor(numberFromSeed(`${matchId}:penalty:minute`) * 78), kind: "penalty" });
  }
  for (const index of [0, 1]) {
    if (numberFromSeed(`${matchId}:bigchance:${index}:awarded`) < 0.3) {
      slots.push({ minute: 6 + Math.floor(numberFromSeed(`${matchId}:bigchance:${index}:minute`) * 82), kind: "chance" });
    }
  }
  // To stopp i samme minutt ville gitt ett felles vindu for to ulike skudd.
  const used = new Set<number>();
  return slots
    .sort((first, second) => first.minute - second.minute)
    .filter((slot) => (used.has(slot.minute) ? false : (used.add(slot.minute), true)));
}

function shotSide(matchId: string, minute: number): MatchSide {
  return numberFromSeed(`${matchId}:${minute}:shot:side`) < 0.5 ? "home" : "away";
}

/**
 * Simulerer hele kampen minutt for minutt. Modellen er bevisst framoverrettet: et minutt
 * avhenger bare av laguttak, kort og bytter fra tidligere minutter, så et bytte senere i
 * kampen kan aldri skrive om noe som allerede er spilt.
 */
export function planManagerTimeline(matchId: string, events: unknown): ManagerMatchEvent[] {
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return Array.isArray(events) ? (events as ManagerMatchEvent[]) : [];
  const substitutions = getManagerSubstitutions(events);
  const sides: MatchSide[] = ["home", "away"];
  const sentOff = new Set<string>();
  const bookings = new Map<string, number>();
  const timeline: TimelineEvent[] = [];
  const shotSlots = new Map(plannedShotSlots(matchId).map((slot) => [slot.minute, slot.kind]));
  const onPitch = {
    home: minutesOnPitch(kickoff.home, substitutions.filter((event) => event.side === "home")),
    away: minutesOnPitch(kickoff.away, substitutions.filter((event) => event.side === "away")),
  };

  for (let minute = 1; minute <= 90; minute += 1) {
    const active = {
      home: lineupAtMinute(kickoff.home, substitutions.filter((event) => event.side === "home"), minute).starters.filter((player) => !sentOff.has(player.id)),
      away: lineupAtMinute(kickoff.away, substitutions.filter((event) => event.side === "away"), minute).starters.filter((player) => !sentOff.has(player.id)),
    };

    for (const side of sides) {
      const opponent: MatchSide = side === "home" ? "away" : "home";
      const players = active[side];
      if (players.length === 0) continue;
      const edge = (teamStrength(players, onPitch[side], minute) - teamStrength(active[opponent], onPitch[opponent], minute)) / 25;
      const attack = 1 + edge * 0.7;
      const goalRate = bounded(BASE_GOAL_RATE * attack, 0.004, 0.06);
      const chanceRate = bounded(BASE_CHANCE_RATE * attack, 0.01, 0.09);
      const roll = numberFromSeed(`${matchId}:${minute}:${side}:event`);

      if (roll < goalRate) {
        const scorer = weightedPick(players, scorerWeights, numberFromSeed(`${matchId}:${minute}:${side}:scorer`));
        if (!scorer) continue;
        const assistCandidates = players.filter((player) => player.id !== scorer.id);
        const solo = numberFromSeed(`${matchId}:${minute}:${side}:solo`) < 0.22;
        const assist = solo ? null : weightedPick(assistCandidates, assistWeights, numberFromSeed(`${matchId}:${minute}:${side}:assist`));
        timeline.push({ type: "goal", minute, side, scorer: scorer.name, scorerId: scorer.id, assist: assist?.name ?? null, assistId: assist?.id ?? null });
        continue;
      }

      if (roll < goalRate + chanceRate) {
        const player = weightedPick(players, scorerWeights, numberFromSeed(`${matchId}:${minute}:${side}:chance`));
        if (!player) continue;
        const outcome = numberFromSeed(`${matchId}:${minute}:${side}:outcome`) < 0.38 ? "post" : "save";
        timeline.push({ type: "chance", minute, side, outcome, player: player.name, playerId: player.id });
        continue;
      }

      if (roll < goalRate + chanceRate + BASE_YELLOW_RATE) {
        const player = weightedPick(players, cardWeights, numberFromSeed(`${matchId}:${minute}:${side}:booking`), (candidate) => (bookings.has(candidate.id) ? BOOKED_DAMPING : 1));
        if (!player) continue;
        const straightRed = numberFromSeed(`${matchId}:${minute}:${side}:red`) < BASE_RED_RATE / BASE_YELLOW_RATE;
        if (straightRed || bookings.has(player.id)) {
          sentOff.add(player.id);
          timeline.push({ type: "card", minute, side, card: "red", player: player.name, playerId: player.id });
        } else {
          bookings.set(player.id, 1);
          timeline.push({ type: "card", minute, side, card: "yellow", player: player.name, playerId: player.id });
        }
      }
    }

    const kind = shotSlots.get(minute);
    if (kind) {
      const side = shotSide(matchId, minute);
      const players = active[side].filter((player) => player.position !== "GK");
      // Straffen tas alltid av den beste avslutteren på banen; en stor sjanse faller på den som er der.
      const taker = kind === "penalty"
        ? [...players].sort((first, second) => shootingOf(second) - shootingOf(first) || first.name.localeCompare(second.name))[0]
        : weightedPick(players, scorerWeights, numberFromSeed(`${matchId}:${minute}:${side}:taker`));
      if (taker) timeline.push({ type: "shot", minute, side, kind, takerId: taker.id, taker: taker.name, options: shotOptions(shootingOf(taker)) });
    }
  }

  return [kickoff, ...substitutions, ...timeline.sort(byMinute)];
}

// ---------------------------------------------------------------------------
// Bytteforslag på 70′
// ---------------------------------------------------------------------------

export type SubstitutionSuggestion = { outId: string; out: ManagerPlayerSnapshot; inId: string; in: ManagerPlayerSnapshot; reason: string };

const positionGroup: Record<string, string> = { GK: "GK", RB: "DEF", CB: "DEF", LB: "DEF", CDM: "MID", CM: "MID", CAM: "MID", RW: "ATT", LW: "ATT", ST: "ATT" };

/**
 * De tre byttene som hjelper laget mest akkurat nå. Et gult kort veier tyngst – en spiller til
 * på kanten av utvisning er dyrere enn noen ratingpoeng – deretter hvor sliten han er og om
 * benken faktisk har en bedre spiller på samme plass.
 */
export function suggestSubstitutions(matchId: string, events: unknown, side: MatchSide, minute: number): SubstitutionSuggestion[] {
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return [];
  const substitutions = getManagerSubstitutions(events).filter((event) => event.side === side);
  const team = lineupAtMinute(kickoff[side], substitutions, minute + 1);
  const timeline = getManagerTimeline(events);
  const sentOff = new Set(timeline.filter((event): event is TimelineCard => event.type === "card" && event.card === "red" && event.minute <= minute).map((event) => event.playerId));
  const booked = new Set(timeline.filter((event): event is TimelineCard => event.type === "card" && event.card === "yellow" && event.minute <= minute && event.side === side).map((event) => event.playerId));
  const onPitch = minutesOnPitch(kickoff[side], substitutions);

  const candidates = team.starters
    // Keeperen byttes praktisk talt aldri i en kamp, heller ikke på gult kort.
    .filter((player) => !sentOff.has(player.id) && player.position !== "GK")
    .flatMap((starter) =>
      team.bench.map((replacement) => {
        const exact = starter.position === replacement.position;
        const sameGroup = positionGroup[starter.position] === positionGroup[replacement.position];
        if (!exact && !sameGroup) return null;
        const tired = fatigueAt(onPitch.get(starter.id) ?? 0, minute);
        const score = (booked.has(starter.id) ? 25 : 0) + (exact ? 12 : 4) + (replacement.overall - starter.overall) * 2.5 + tired * 3;
        const reason = booked.has(starter.id)
          ? "Har gult kort – står i fare for å bli utvist"
          : replacement.overall > starter.overall
            ? `Sterkere alternativ (+${replacement.overall - starter.overall})`
            : tired >= 3
              ? "Friske bein inn for en sliten spiller"
              : "Bytte på samme posisjon";
        return { outId: starter.id, out: starter, inId: replacement.id, in: replacement, reason, score };
      }),
    )
    .filter((candidate): candidate is SubstitutionSuggestion & { score: number } => candidate !== null)
    .sort((first, second) => second.score - first.score || first.out.name.localeCompare(second.out.name));

  // Det samme byttet skal ikke foreslås tre ganger med ulik innbytter.
  const usedOut = new Set<string>();
  const usedIn = new Set<string>();
  const chosen: SubstitutionSuggestion[] = [];
  for (const candidate of candidates) {
    if (usedOut.has(candidate.outId) || usedIn.has(candidate.inId)) continue;
    usedOut.add(candidate.outId);
    usedIn.add(candidate.inId);
    chosen.push({ outId: candidate.outId, out: candidate.out, inId: candidate.inId, in: candidate.in, reason: candidate.reason });
    if (chosen.length === 3) break;
  }
  return chosen;
}

// ---------------------------------------------------------------------------
// Stilling og rapport
// ---------------------------------------------------------------------------

export function scoreAtMinute(events: unknown, shots: ShotResult[], minute: number) {
  const goals = getManagerGoals(events).filter((goal) => goal.minute <= minute);
  const scored = shots.filter((shot) => shot.outcome === "goal" && shot.minute <= minute);
  return {
    home: goals.filter((goal) => goal.side === "home").length + scored.filter((shot) => shot.side === "home").length,
    away: goals.filter((goal) => goal.side === "away").length + scored.filter((shot) => shot.side === "away").length,
  };
}

/** En deterministisk rapport, så begge managerne ser den samme kampstatistikken. */
export function getManagerMatchReport(matchId: string, events: unknown, shots: ShotResult[] = [], untilMinute = 90): ManagerMatchReport | null {
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return null;
  const homeTeam = teamAfterSubstitutions(events, "home") ?? kickoff.home;
  const awayTeam = teamAfterSubstitutions(events, "away") ?? kickoff.away;
  const timeline = getManagerTimeline(events).filter((event) => event.minute <= untilMinute);
  const inWindow = shots.filter((shot) => shot.minute <= untilMinute);
  const score = scoreAtMinute(events, shots, untilMinute);
  const saved = (side: MatchSide) => timeline.filter((event) => event.type === "chance" && event.side === side && event.outcome === "save").length;
  const posts = (side: MatchSide) => timeline.filter((event) => event.type === "chance" && event.side === side && event.outcome === "post").length;
  const takenShots = (side: MatchSide) => inWindow.filter((shot) => shot.side === side && shot.outcome !== null).length;
  const homeStrength = averageOverall(homeTeam);
  const awayStrength = averageOverall(awayTeam);
  const homePossession = Math.round(bounded(50 + (homeStrength - awayStrength) * 0.72 + (numberFromSeed(`${matchId}:possession`) - .5) * 4, 34, 66));
  // Skudd utenfor mål finnes ikke som hendelse, så de anslås deterministisk ut fra det som skjedde.
  const shotsFor = (side: MatchSide) => score[side] + saved(side) + posts(side) + takenShots(side) + Math.round(numberFromSeed(`${matchId}:${side}:wide`) * 4 + 1);
  const onTargetFor = (side: MatchSide) => score[side] + saved(side) + inWindow.filter((shot) => shot.side === side && shot.outcome === "saved").length;

  const goalCounts = new Map<string, number>();
  for (const event of timeline) if (event.type === "goal") goalCounts.set(event.scorer, (goalCounts.get(event.scorer) ?? 0) + 1);
  const playerOfMatch = [...homeTeam.starters, ...awayTeam.starters].sort((first, second) => {
    const firstScore = first.overall + (goalCounts.get(first.name) ?? 0) * 20;
    const secondScore = second.overall + (goalCounts.get(second.name) ?? 0) * 20;
    return secondScore - firstScore || first.name.localeCompare(second.name);
  })[0]?.name ?? "Kampens spiller";

  return {
    home: { strength: Math.round(homeStrength), possession: homePossession, shots: shotsFor("home"), onTarget: onTargetFor("home") },
    away: { strength: Math.round(awayStrength), possession: 100 - homePossession, shots: shotsFor("away"), onTarget: onTargetFor("away") },
    playerOfMatch,
  };
}

/** Spillerne i kampen slått opp på id, slik kampbildet kan tegne kortet til den som er involvert. */
export function playersById(events: unknown): Map<string, ManagerPlayerSnapshot> {
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return new Map();
  return new Map([...kickoff.home.starters, ...kickoff.home.bench, ...kickoff.away.starters, ...kickoff.away.bench].map((player) => [player.id, player]));
}
