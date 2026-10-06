import { anyPosition } from "./lineup";
import { aimRadius, autoAim, autoKeeperTap, autoRelease, ballTarget, clampAim, IDLE_AIM, MOMENT_MS, planWall, resolveAim, type AimPoint, type AimResolution, type KeeperTap, type Wall } from "./shot-aim";

export type AttributeKey = "pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical";
export type PlayerAttributes = Partial<Record<AttributeKey, number>>;

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
  /** Kortets attributter. Fra kampversjon 5 er det disse, ikke bare ratingen, som spiller kampen. */
  attributes?: PlayerAttributes | null;
};
/**
 * `bonus` er en skjult styrke som bare AI-klubber i arena 2–5 har. Den legges på angrep, forsvar,
 * avslutninger og keeper i kampmodellen, men vises aldri som rating på spillerne.
 */
export type ManagerTeamSnapshot = { userId: string; formation: string; starters: ManagerPlayerSnapshot[]; bench: ManagerPlayerSnapshot[]; bonus?: number };
/**
 * `knockout` settes på kamper som må ha en vinner (kvalik til opprykk): står det likt etter 90′,
 * spilles ekstraomganger, og står det fortsatt likt etter 120′, avgjøres kampen på straffer.
 */
export type ManagerKickoffEvent = { type: "kickoff"; version: 1 | 2 | 3 | 4 | 5; home: ManagerTeamSnapshot; away: ManagerTeamSnapshot; knockout?: boolean };
/**
 * Kamper som startes nå får versjon 5: kortenes attributter spiller kampen, det er ingen bytter,
 * og seks nøkkeløyeblikk der managerne selv skyter og redder (se shot-aim.ts). Eldre kamper
 * beholder modellen de ble startet med, så lagrede kamper vises slik de ble spilt.
 */
export const MANAGER_KICKOFF_VERSION = 5;
export type MatchSide = "home" | "away";
export type ManagerSubstitutionEvent = { type: "substitution"; side: MatchSide; outId: string; inId: string; minute: number };
export type ManagerFullTimeEvent = { type: "full_time"; minute: 90; homeScore: number; awayScore: number };
export type TimelineGoal = { type: "goal"; minute: number; side: MatchSide; scorer: string; scorerId?: string; assist?: string | null; assistId?: string | null };
export type TimelineCard = { type: "card"; minute: number; side: MatchSide; card: "yellow" | "red"; player: string; playerId: string };
export type TimelineChance = { type: "chance"; minute: number; side: MatchSide; outcome: "post" | "save"; player: string; playerId: string; keeper?: string | null };
export type ShotKind = "penalty" | "chance" | "freekick" | "longshot";
/**
 * En planlagt sjanse spilleren selv skyter. Utfallet lagres i career_match_shots, ikke her.
 * `keeperId` og `reach` finnes bare på kamper fra versjon 4: hvem som står i mål, og hvor mange
 * ruter han dekker når han kaster seg på straffe.
 */
export type TimelineShot = {
  type: "shot"; minute: number; side: MatchSide; kind: ShotKind; takerId: string; taker: string; options: number[]; keeperId?: string | null; reach?: number;
  /**
   * Bare nøkkeløyeblikk (versjon 5): presisjonssirkelen til skytteren, keeperens styrke med en
   * eventuell skjult bonus, muren på frispark, og når en datastyrt skytter skyter (ms inn i øyeblikket).
   */
  radius?: number; keeperRating?: number; wall?: Wall | null; release?: number;
};
/** Et nøkkeløyeblikk der skytteren sikter selv og keeperen redder selv. */
export type AimShot = TimelineShot & { radius: number; keeperRating: number };
export type TimelineEvent = TimelineGoal | TimelineCard | TimelineChance | ManagerSubstitutionEvent | TimelineShot;
/**
 * Ett spark i straffekonkurransen. Den simuleres ferdig ved avspark – ingen velger noe – og
 * listen slutter på sparket som avgjør, så den kan telles rett fram av både visningen og databasen.
 */
export type ShootoutKick = { type: "shootout_kick"; order: number; round: number; side: MatchSide; takerId: string; taker: string; keeper: string | null; scored: boolean };
export type ManagerMatchEvent = ManagerKickoffEvent | TimelineEvent | ManagerFullTimeEvent | ShootoutKick;

/**
 * Raden fra career_match_shots: hva de to faktisk valgte, og hvordan det gikk. Rutene gjelder
 * eldre kamper; nøkkeløyeblikkene lagrer siktet og keeperens trykk i stedet.
 */
export type ShotResult = {
  minute: number; kind: ShotKind; side: MatchSide; shooterCell: number | null; keeperCell: number | null; outcome: "goal" | "saved" | "missed" | null;
  aimX?: number | null; aimY?: number | null; saveX?: number | null; saveY?: number | null; saveMs?: number | null;
};

export type ManagerMatchReport = {
  home: { strength: number; possession: number; shots: number; onTarget: number };
  away: { strength: number; possession: number; shots: number; onTarget: number };
  /** null når ingen spillere finnes i oppsettet – visningen setter inn en tekst på brukerens språk. */
  playerOfMatch: string | null;
};

// ---------------------------------------------------------------------------
// Kampklokke
// ---------------------------------------------------------------------------

/** 90 kampminutter spilles på to ganger 25 sekunder. */
export const HALF_MS = 25_000;
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

/** Ekstraomgangene går i samme tempo som resten av kampen, med en kort pust før og midt i. */
export const EXTRA_BREAK_MS = 5_000;
export const EXTRA_HALFTIME_MINUTE = 105;
export const EXTRA_HALFTIME_MS = 3_000;
export const EXTRA_TIME_END = 120;
/** Før straffekonkurransen, og deretter tre sekunder per spark: tilløp, så utfallet. */
export const SHOOTOUT_BREAK_MS = 4_000;
export const KICK_MS = 3_000;
export const KICK_REVEAL_AFTER_MS = 1_500;

export type MatchPhase = "first_half" | "halftime" | "second_half" | "substitutions" | "shot" | "extra_break" | "extra_first" | "extra_halftime" | "extra_second" | "shootout_break" | "shootout" | "full_time";
/** `kickIndex` er sparket som tas akkurat nå (0-basert) og `kickElapsedMs` hvor langt det har kommet. */
export type MatchClock = { phase: MatchPhase; minute: number; remainingMs: number; shotMinute: number | null; shotElapsedMs: number; kickIndex: number; kickElapsedMs: number };
/** Hvor langt kampen går utover 90′: ekstraomganger, og i så fall hvor mange straffespark. */
export type MatchExtension = { extraTime: boolean; kicks: number };
export const NO_EXTENSION: MatchExtension = { extraTime: false, kicks: 0 };

/**
 * Hvordan klokka stopper: eldre kamper har byttevinduet på 70′ og ti sekunder per sjanse, kamper
 * fra versjon 5 har ingen bytter og sju sekunder per nøkkeløyeblikk.
 */
export type ClockSpec = { subWindow: boolean; shotMs: number };
export const LEGACY_CLOCK: ClockSpec = { subWindow: true, shotMs: SHOT_MS };
export const AIM_CLOCK: ClockSpec = { subWindow: false, shotMs: MOMENT_MS };

export function clockSpecOf(events: unknown): ClockSpec {
  return (getManagerKickoff(events)?.version ?? 0) >= 5 ? AIM_CLOCK : LEGACY_CLOCK;
}

type Stoppage = { minute: number; ms: number; phase: MatchPhase };

function stoppagesFor(shotMinutes: number[], extension: MatchExtension, spec: ClockSpec): Stoppage[] {
  return [
    { minute: HALF_MINUTES, ms: HALFTIME_MS, phase: "halftime" as const },
    ...(spec.subWindow ? [{ minute: SUB_WINDOW_MINUTE, ms: SUB_WINDOW_MS, phase: "substitutions" as const }] : []),
    ...shotMinutes.map((minute) => ({ minute, ms: spec.shotMs, phase: "shot" as const })),
    ...(extension.extraTime
      ? [
          { minute: 90, ms: EXTRA_BREAK_MS, phase: "extra_break" as const },
          { minute: EXTRA_HALFTIME_MINUTE, ms: EXTRA_HALFTIME_MS, phase: "extra_halftime" as const },
        ]
      : []),
  ].sort((first, second) => first.minute - second.minute);
}

function runningPhase(minute: number): MatchPhase {
  if (minute <= HALF_MINUTES) return "first_half";
  if (minute <= 90) return "second_half";
  return minute <= EXTRA_HALFTIME_MINUTE ? "extra_first" : "extra_second";
}

/**
 * Klokka går aldri bakover og henger aldri: den regnes ut fra hvor mye tid som har gått,
 * minutt for minutt, med stoppene lagt inn på faste steder. Fordi alle stoppene er kjent
 * ved avspark, kommer begge klientene fram til nøyaktig samme minutt uten å snakke sammen.
 */
export function matchClock(elapsedMs: number, shotMinutes: number[], extension: MatchExtension, spec: ClockSpec): MatchClock {
  const stoppages = stoppagesFor(shotMinutes, extension, spec);
  const lastMinute = extension.extraTime ? EXTRA_TIME_END : 90;
  const idle = { shotMinute: null, shotElapsedMs: 0, kickIndex: 0, kickElapsedMs: 0 };
  let remaining = Math.max(0, elapsedMs);

  for (let minute = 1; minute <= lastMinute; minute += 1) {
    if (remaining < MS_PER_MINUTE) {
      return { ...idle, phase: runningPhase(minute), minute: minute - 1, remainingMs: msUntilBreak(minute, remaining, stoppages, lastMinute) };
    }
    remaining -= MS_PER_MINUTE;

    for (const stoppage of stoppages.filter((entry) => entry.minute === minute)) {
      if (remaining < stoppage.ms) {
        return { ...idle, phase: stoppage.phase, minute, remainingMs: stoppage.ms - remaining, shotMinute: stoppage.phase === "shot" ? minute : null, shotElapsedMs: stoppage.phase === "shot" ? remaining : 0 };
      }
      remaining -= stoppage.ms;
    }
  }

  if (extension.kicks > 0) {
    if (remaining < SHOOTOUT_BREAK_MS) return { ...idle, phase: "shootout_break", minute: lastMinute, remainingMs: SHOOTOUT_BREAK_MS - remaining };
    remaining -= SHOOTOUT_BREAK_MS;
    if (remaining < extension.kicks * KICK_MS) {
      return { ...idle, phase: "shootout", minute: lastMinute, remainingMs: extension.kicks * KICK_MS - remaining, kickIndex: Math.floor(remaining / KICK_MS), kickElapsedMs: remaining % KICK_MS };
    }
  }

  return { ...idle, phase: "full_time", minute: lastMinute, remainingMs: 0, kickIndex: extension.kicks };
}

/** Sekundene som er igjen til neste stopp, slik nedtellingen viser noe meningsfylt. */
function msUntilBreak(minute: number, intoMinute: number, stoppages: Stoppage[], lastMinute: number): number {
  const next = stoppages.find((entry) => entry.minute >= minute)?.minute ?? lastMinute;
  return (next - minute) * MS_PER_MINUTE + (MS_PER_MINUTE - intoMinute);
}

/** Hele kampens lengde i sanntid, inkludert pause, eventuelt byttevindu, sjanser og forlengelse. */
export function plannedDurationMs(shotMinutes: number[], extension: MatchExtension, spec: ClockSpec): number {
  const regular = 90 * MS_PER_MINUTE + HALFTIME_MS + (spec.subWindow ? SUB_WINDOW_MS : 0) + shotMinutes.length * spec.shotMs;
  const extra = extension.extraTime ? (EXTRA_TIME_END - 90) * MS_PER_MINUTE + EXTRA_BREAK_MS + EXTRA_HALFTIME_MS : 0;
  const shootout = extension.kicks > 0 ? SHOOTOUT_BREAK_MS + extension.kicks * KICK_MS : 0;
  return regular + extra + shootout;
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
  const known = kickoff.version === 1 || kickoff.version === 2 || kickoff.version === 3 || kickoff.version === 4 || kickoff.version === 5;
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
  return goal.type === "goal" && Number.isInteger(goal.minute) && Number(goal.minute) >= 1 && Number(goal.minute) <= EXTRA_TIME_END && (goal.side === "home" || goal.side === "away") && typeof goal.scorer === "string";
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
  return shot.type === "shot" && Number.isInteger(shot.minute) && (shot.side === "home" || shot.side === "away") && (shot.kind === "penalty" || shot.kind === "chance" || shot.kind === "freekick" || shot.kind === "longshot") && typeof shot.taker === "string" && Array.isArray(shot.options);
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

function isShootoutKick(value: unknown): value is ShootoutKick {
  if (!value || typeof value !== "object") return false;
  const kick = value as Record<string, unknown>;
  return kick.type === "shootout_kick" && Number.isInteger(kick.order) && (kick.side === "home" || kick.side === "away") && typeof kick.taker === "string" && typeof kick.scored === "boolean";
}

/** Straffekonkurransen i rekkefølge. Tom for alle kamper som ikke er utslagskamper. */
export function getShootout(events: unknown): ShootoutKick[] {
  if (!Array.isArray(events)) return [];
  return events.filter(isShootoutKick).sort((first, second) => first.order - second.order);
}

export function shootoutScore(kicks: ShootoutKick[]) {
  return {
    home: kicks.filter((kick) => kick.side === "home" && kick.scored).length,
    away: kicks.filter((kick) => kick.side === "away" && kick.scored).length,
  };
}

/**
 * Om kampen går til ekstraomganger og straffer. Det avgjøres av stillingen etter 90′ og 120′,
 * og databasen bruker nøyaktig samme regel når resultatet lagres.
 */
export function matchExtension(events: unknown, shots: ShotResult[]): MatchExtension {
  if (!getManagerKickoff(events)?.knockout) return NO_EXTENSION;
  const regular = scoreAtMinute(events, shots, 90);
  if (regular.home !== regular.away) return NO_EXTENSION;
  const extra = scoreAtMinute(events, shots, EXTRA_TIME_END);
  return { extraTime: true, kicks: extra.home === extra.away ? getShootout(events).length : 0 };
}

export function teamAfterSubstitutions(events: unknown, side: MatchSide): ManagerTeamSnapshot | null {
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return null;
  return lineupAtMinute(kickoff[side], getManagerSubstitutions(events).filter((event) => event.side === side), EXTRA_TIME_END + 1);
}

/** Laget slik det så ut i starten av `minute`, altså etter bytter gjort tidligere enn dette minuttet. */
function lineupAtMinute(team: ManagerTeamSnapshot, substitutions: ManagerSubstitutionEvent[], minute: number): ManagerTeamSnapshot {
  const starters = [...team.starters];
  const bench = [...team.bench];
  for (const substitution of substitutions.filter((event) => event.minute < minute).sort((first, second) => first.minute - second.minute)) {
    const starterIndex = starters.findIndex((player) => player.id === substitution.outId);
    const benchIndex = bench.findIndex((player) => player.id === substitution.inId);
    if (starterIndex < 0 || benchIndex < 0) continue;
    // Et personlig kort kan spille alt, og tar over plassen til den som går av.
    const incoming = bench[benchIndex];
    starters[starterIndex] = incoming.position === anyPosition ? { ...incoming, position: starters[starterIndex].position } : incoming;
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
  const fromCard = player.attributes?.shooting;
  if (typeof fromCard === "number" && fromCard > 0) return fromCard;
  return typeof player.shooting === "number" && player.shooting > 0 ? player.shooting : player.overall;
}

// ---------------------------------------------------------------------------
// Attributter
// ---------------------------------------------------------------------------

/**
 * Attributtene et kort uten egne verdier får: samme regel som katalogen bruker når den regner ut
 * kortene (se 0012_expand_player_catalog.sql). AI-spillerne får sine herfra.
 */
const attributeOffsets: Record<AttributeKey, (position: string) => number> = {
  pace: (position) => (position === "GK" ? -12 : ["RW", "LW"].includes(position) ? 7 : position === "ST" ? 4 : ["RB", "LB"].includes(position) ? 3 : -1),
  shooting: (position) => (position === "GK" ? -22 : position === "ST" ? 6 : ["RW", "LW", "CAM"].includes(position) ? 3 : ["CB", "RB", "LB"].includes(position) ? -18 : position === "CDM" ? -9 : -2),
  passing: (position) => (position === "GK" ? -5 : ["CM", "CAM", "CDM"].includes(position) ? 4 : ["CB", "RB", "LB"].includes(position) ? -6 : position === "ST" ? -9 : 0),
  dribbling: (position) => (position === "GK" ? -6 : ["RW", "LW", "CAM"].includes(position) ? 5 : position === "ST" ? 1 : ["CB", "RB", "LB"].includes(position) ? -8 : 0),
  defending: (position) => (position === "GK" ? -3 : position === "CB" ? 6 : ["RB", "LB"].includes(position) ? 3 : position === "CDM" ? 4 : ["RW", "LW", "ST"].includes(position) ? -25 : position === "CAM" ? -17 : -8),
  physical: (position) => (position === "GK" ? 0 : ["CB", "ST"].includes(position) ? 3 : position === "CDM" ? 2 : ["RW", "LW"].includes(position) ? -5 : -1),
};
const attributeKeys = Object.keys(attributeOffsets) as AttributeKey[];

export function derivedAttributes(position: string, overall: number): Record<AttributeKey, number> {
  return Object.fromEntries(attributeKeys.map((key) => [key, bounded(overall + attributeOffsets[key](position), 20, 99)])) as Record<AttributeKey, number>;
}

/** Bare tallene kampen bruker, så avsparket i databasen ikke fylles med annet fra kortet. */
export function matchAttributes(value: unknown): PlayerAttributes | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const picked = attributeKeys.filter((key) => typeof source[key] === "number").map((key) => [key, source[key] as number]);
  return picked.length ? (Object.fromEntries(picked) as PlayerAttributes) : null;
}

export function attributeOf(player: ManagerPlayerSnapshot, key: AttributeKey): number {
  const value = player.attributes?.[key];
  return typeof value === "number" && value > 0 ? value : derivedAttributes(player.position, player.overall)[key];
}

type Blend = Partial<Record<AttributeKey, number>>;
const attackBlends: Record<string, Blend> = {
  ST: { shooting: 0.45, dribbling: 0.25, pace: 0.2, physical: 0.1 },
  SA: { shooting: 0.4, dribbling: 0.3, pace: 0.2, passing: 0.1 },
  WING: { pace: 0.3, dribbling: 0.3, shooting: 0.2, passing: 0.2 },
  MID: { passing: 0.4, dribbling: 0.3, shooting: 0.2, pace: 0.1 },
  HOLD: { passing: 0.6, dribbling: 0.2, physical: 0.2 },
  BACK: { passing: 0.4, pace: 0.35, dribbling: 0.25 },
};
const defenceBlends: Record<string, Blend> = {
  BACK: { defending: 0.55, physical: 0.25, pace: 0.2 },
  HOLD: { defending: 0.55, physical: 0.3, passing: 0.15 },
  MID: { defending: 0.4, physical: 0.3, passing: 0.3 },
  FRONT: { physical: 0.4, pace: 0.3, defending: 0.3 },
};
const attackGroup: Record<string, string> = { ST: "ST", SA: "SA", LW: "WING", RW: "WING", LM: "WING", RM: "WING", CAM: "MID", CM: "MID", CDM: "HOLD", CB: "BACK", LB: "BACK", RB: "BACK", LWB: "BACK", RWB: "BACK" };
const defenceGroup: Record<string, string> = { CB: "BACK", LB: "BACK", RB: "BACK", LWB: "BACK", RWB: "BACK", CDM: "HOLD", CM: "MID", CAM: "MID", LM: "MID", RM: "MID", LW: "FRONT", RW: "FRONT", ST: "FRONT", SA: "FRONT" };

function blended(player: ManagerPlayerSnapshot, blend: Blend | undefined): number {
  // Keeperen (og en ukjent posisjon) måles på ratingen, som for en keeper er nettopp keeperferdighetene.
  if (!blend) return player.overall;
  return attributeKeys.reduce((total, key) => total + (blend[key] ?? 0) * attributeOf(player, key), 0);
}

/** Hva en spiller bidrar med framover: en spiss på avslutning og fart, en sentral midtbane på pasninger. */
export function attackValue(player: ManagerPlayerSnapshot): number {
  return blended(player, attackBlends[attackGroup[player.position] ?? ""]);
}

/** Hva en spiller bidrar med bakover: en stopper på takling og styrke, en spiss på press. */
export function defenceValue(player: ManagerPlayerSnapshot): number {
  return blended(player, defenceBlends[defenceGroup[player.position] ?? ""]);
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

/** Fra versjon 5 sliter en spiller med god fysikk mindre enn en med svak. */
function staminaScale(player: ManagerPlayerSnapshot): number {
  return bounded(1.5 - attributeOf(player, "physical") / 100, 0.6, 1.2);
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

// Hvor mye hver plass teller i angrepet og i forsvaret. Keeperen veier tyngst av alle bakover.
const attackWeights: Record<string, number> = { ST: 3, SA: 3, LW: 2.6, RW: 2.6, LM: 2, RM: 2, CAM: 2.4, CM: 1.4, CDM: 0.7, LWB: 0.9, RWB: 0.9, LB: 0.6, RB: 0.6, CB: 0.3, GK: 0 };
const defenceWeights: Record<string, number> = { GK: 3, CB: 2.6, LB: 1.8, RB: 1.8, LWB: 1.4, RWB: 1.4, CDM: 1.8, CM: 0.9, LM: 0.5, RM: 0.5, CAM: 0.3, LW: 0.2, RW: 0.2, ST: 0.1, SA: 0.1 };

/**
 * Som lagstyrken, men med plassene vektet – en god spiss løfter angrepet, en god keeper forsvaret.
 * `value` er det spilleren måles på: ratingen i eldre kamper, attributtene fra versjon 5.
 */
type UnitValue = { value: (player: ManagerPlayerSnapshot) => number; stamina: boolean };
const RATING_VALUE: UnitValue = { value: (player) => player.overall, stamina: false };
const ATTACK_VALUE: UnitValue = { value: attackValue, stamina: true };
const DEFENCE_VALUE: UnitValue = { value: defenceValue, stamina: true };

function unitStrength(players: ManagerPlayerSnapshot[], weights: Record<string, number>, onPitch: Map<string, number>, minute: number, unit: UnitValue = RATING_VALUE): number {
  if (players.length === 0) return 40;
  let total = 0;
  let weight = 0;
  for (const player of players) {
    const share = weights[player.position] ?? 1;
    const tired = fatigueAt(onPitch.get(player.id) ?? 0, minute) * (unit.stamina ? staminaScale(player) : 1);
    total += share * (unit.value(player) - tired);
    weight += share;
  }
  return (weight > 0 ? total / weight : 40) - Math.max(0, 11 - players.length) * 7;
}

/** Keeperen som står i mål akkurat nå. Er han utvist, står en utespiller der – og det merkes. */
function keeperOf(players: ManagerPlayerSnapshot[]): { id: string | null; name: string | null; rating: number } {
  const keeper = players.find((player) => player.position === "GK");
  return keeper ? { id: keeper.id, name: keeper.name, rating: keeper.overall } : { id: null, name: null, rating: 40 };
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

/**
 * Den faktiske sjansen for mål i en gitt rute på en stor sjanse – det er dette tallet som står
 * på ruta, og skuddet avgjøres i én trekning mot nøyaktig det. En god avslutter drar sjansen
 * opp, en god keeper drar den ned. Straffer avgjøres av keeperens kast, se penaltyCellChance.
 */
export function cellGoalChance(shooting: number, cell: number, keeper: number | null = null): number {
  const base = bounded(0.42 + (shooting - 55) * 0.004, 0.28, 0.8);
  const keeperFactor = keeper !== null ? bounded(1 + (70 - keeper) * 0.015, 0.7, 1.3) : 1;
  return bounded(base * (PLACEMENT[cell] ?? 0.85) * keeperFactor, 0.05, 0.97);
}

/**
 * Hvor mange ruter keeperen dekker når han kaster seg på straffe: en god keeper mot en middels
 * straffetaker når tre, en svak keeper bare ruta han valgte. Skytteren har alltid minst to
 * ruter keeperen ikke kan dekke, så straffen er aldri avgjort før han har valgt.
 */
export function penaltyReach(keeper: number, shooting: number, optionCount: number): number {
  const reach = Math.round(1 + (keeper - 65) / 10 - (shooting - 75) / 12);
  return bounded(reach, 1, Math.max(1, Math.min(3, optionCount - 2)));
}

/**
 * Rutene keeperen dekker: den han valgte, pluss de nærmeste naborutene skytteren kan sikte
 * på. Et kast går sidelengs, så ruta ved siden av velges før den over eller under.
 */
export function keeperZone(shot: TimelineShot, keeperCell: number | null): number[] {
  if (keeperCell === null) return [];
  const reach = shot.reach ?? 1;
  const row = Math.floor(keeperCell / SHOT_COLUMNS);
  const column = keeperCell % SHOT_COLUMNS;
  const neighbours = shot.options
    .filter((cell) => cell !== keeperCell)
    .map((cell) => ({ cell, rows: Math.abs(Math.floor(cell / SHOT_COLUMNS) - row), columns: Math.abs((cell % SHOT_COLUMNS) - column) }))
    .filter((entry) => entry.rows <= 1 && entry.columns <= 1)
    .sort((first, second) => first.columns + first.rows * 1.5 - (second.columns + second.rows * 1.5) || first.cell - second.cell);
  return [keeperCell, ...neighbours.slice(0, reach - 1).map((entry) => entry.cell)];
}

/**
 * Sjansen for mål på straffe i en gitt rute: andelen av keeperens mulige kast som ikke når
 * den. En god straffetaker har flere ruter å velge mellom og møter et kortere kast, så han
 * scorer oftere.
 */
export function penaltyCellChance(shot: TimelineShot, cell: number): number {
  const covering = shot.options.filter((keeperCell) => keeperZone(shot, keeperCell).includes(cell)).length;
  return 1 - covering / shot.options.length;
}

/**
 * Sjansen for mål i en gitt rute på en stor sjanse: avslutterens sjanse mot keeperen, men aldri
 * høyere enn andelen av keeperens kast som ikke når ruta.
 */
export function chanceCellChance(shot: TimelineShot, shooting: number, cell: number, keeper: number | null): number {
  return Math.min(cellGoalChance(shooting, cell, keeper), penaltyCellChance(shot, cell));
}

/** Ratingen til keeperen skuddet går mot, eller null på eldre kamper der keeperen ikke telte. */
export function shotKeeperRating(shot: TimelineShot, players: Map<string, ManagerPlayerSnapshot>): number | null {
  if (shot.keeperId === undefined) return null;
  return (shot.keeperId ? players.get(shot.keeperId)?.overall : undefined) ?? 40;
}

/**
 * Utfallet regnes ut likt hos begge managerne: samme kamp, samme minutt og samme to valg
 * gir alltid samme svar, så ingen av dem ser et annet resultat enn den andre.
 *
 * En straffe bommer aldri: når keeperen ruta skytteren valgte, er det redning, ellers er det mål.
 *
 * På en stor sjanse kaster keeperen seg også, og når han ruta, er det redning. Ellers avgjøres
 * skuddet i én trekning, skalert slik at den totale sjansen blir prosenten som står på ruta.
 * Går det ikke inn, deles det mellom redning og bom etter hvor god keeperen er.
 */
export function resolveShot(matchId: string, shot: TimelineShot, shooting: number, keeper: number | null, shooterCell: number, keeperCell: number | null): "goal" | "saved" | "missed" {
  if (shot.kind === "penalty") return keeperZone(shot, keeperCell).includes(shooterCell) ? "saved" : "goal";
  // Keeperens valg er med i frøet så skytteren ikke kan regne ut trekningen på forhånd; hvert
  // utfall er likevel like tilfeldig, så sjansen blir den samme uansett hva keeperen velger.
  const roll = numberFromSeed(`${matchId}:${shot.minute}:${shot.side}:shot:${shooterCell}:${keeperCell ?? "none"}`);
  // Keeperen telte bare fra versjon 4; på eldre kamper gir en stor sjanse aldri redning.
  const rated = shot.keeperId !== undefined;
  if (rated && keeperZone(shot, keeperCell).includes(shooterCell)) return "saved";
  const chance = rated && keeperCell !== null
    ? Math.min(1, chanceCellChance(shot, shooting, shooterCell, keeper) / penaltyCellChance(shot, shooterCell))
    : cellGoalChance(shooting, shooterCell, rated ? keeper : null);
  if (roll < chance) return "goal";
  if (!rated) return "missed";
  // Det som ikke går inn, er en redning oftere jo bedre keeperen er.
  const saveShare = bounded(0.55 + ((keeper ?? 60) - shooting) * 0.01, 0.35, 0.8);
  return (roll - chance) / (1 - chance) < saveShare ? "saved" : "missed";
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

function weightedPick(players: ManagerPlayerSnapshot[], weights: Record<string, number>, roll: number, damp?: (player: ManagerPlayerSnapshot) => number, rating: (player: ManagerPlayerSnapshot) => number = (player) => player.overall): ManagerPlayerSnapshot | null {
  if (players.length === 0) return null;
  const weightOf = (player: ManagerPlayerSnapshot) => Math.max(0, weights[player.position] ?? 2) * (0.6 + rating(player) / 150) * (damp?.(player) ?? 1);
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

// Versjon 4: først avgjør angrep mot forsvar hvor ofte laget kommer til avslutning, deretter
// avgjør avslutteren mot keeperen om det blir mål. Et bedre lag vinner dermed på begge.
const BASE_ATTEMPT_RATE = 0.052;
const ATTACK_SLOPE = 0.02;
const BASE_FINISH = 0.33;
const FINISH_SLOPE = 0.012;
/**
 * Fra versjon 5 kommer færre mål fra det simulerte spillet, fordi seks nøkkeløyeblikk der
 * managerne selv skyter og redder skal avgjøre mer av kampen.
 */
const AIM_ATTEMPT_RATE = 0.016;

/** Sjansen for at en avslutning i åpent spill går i mål. */
export function finishChance(shooting: number, keeper: number): number {
  return bounded(BASE_FINISH * Math.exp((shooting - keeper) * FINISH_SLOPE), 0.08, 0.7);
}

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

/** Seks nøkkeløyeblikk per kamp, ett i hver bolk, så de kommer jevnt fordelt over kampen. */
export const MOMENTS_PER_MATCH = 6;
const MOMENT_WINDOWS: [number, number][] = [[4, 13], [17, 27], [31, 42], [49, 58], [62, 73], [77, 88]];

function momentKind(roll: number): ShotKind {
  if (roll < 0.15) return "penalty";
  if (roll < 0.35) return "freekick";
  if (roll < 0.6) return "longshot";
  return "chance";
}

/**
 * Når nøkkeløyeblikkene kommer, hvem som har ballen og hva slags øyeblikk det er. Laget som har
 * mest angrep mot motstanderens forsvar ved avspark får flest (opptil fire av seks), men begge
 * lag får alltid minst to – kortene betyr noe, men skill kan snu det.
 */
export function plannedMoments(matchId: string, kickoff: ManagerKickoffEvent): { minute: number; side: MatchSide; kind: ShotKind }[] {
  const none = new Map<string, number>();
  const edge = (side: MatchSide, opponent: MatchSide) =>
    unitStrength(kickoff[side].starters, attackWeights, none, 0, ATTACK_VALUE) + (kickoff[side].bonus ?? 0) - unitStrength(kickoff[opponent].starters, defenceWeights, none, 0, DEFENCE_VALUE) - (kickoff[opponent].bonus ?? 0);
  const homeShare = bounded(0.5 + (edge("home", "away") - edge("away", "home")) * 0.02, 0.25, 0.75);
  const homeCount = bounded(Math.round(MOMENTS_PER_MATCH * homeShare), 2, MOMENTS_PER_MATCH - 2);
  // Hvilke av de seks som er hjemmelagets, stokkes etter kamp-id.
  const order = MOMENT_WINDOWS.map((_, index) => index).sort((first, second) => numberFromSeed(`${matchId}:moment:${first}:order`) - numberFromSeed(`${matchId}:moment:${second}:order`));
  const homeSlots = new Set(order.slice(0, homeCount));
  return MOMENT_WINDOWS.map(([from, to], index) => ({
    minute: from + Math.floor(numberFromSeed(`${matchId}:moment:${index}:minute`) * (to - from + 1)),
    side: homeSlots.has(index) ? "home" : "away",
    kind: momentKind(numberFromSeed(`${matchId}:moment:${index}:kind`)),
  }));
}

const longShotWeights: Record<string, number> = { CAM: 6, CM: 5, LW: 4, RW: 4, ST: 4, LM: 3.5, RM: 3.5, CDM: 3, LB: 1, RB: 1, CB: 0.8, GK: 0 };

/** Hvem som får øyeblikket: den beste skytteren på straffe og frispark, ellers den som er der. */
function momentTaker(matchId: string, minute: number, side: MatchSide, kind: ShotKind, players: ManagerPlayerSnapshot[]): ManagerPlayerSnapshot | null {
  const outfield = players.filter((player) => player.position !== "GK");
  const best = (score: (player: ManagerPlayerSnapshot) => number) => [...outfield].sort((first, second) => score(second) - score(first) || first.name.localeCompare(second.name))[0] ?? null;
  const shooting = (player: ManagerPlayerSnapshot) => attributeOf(player, "shooting");
  if (kind === "penalty") return best(shooting);
  if (kind === "freekick") return best(freeKickSkill);
  const roll = numberFromSeed(`${matchId}:${minute}:${side}:taker`);
  return kind === "longshot" ? weightedPick(outfield, longShotWeights, roll, undefined, shooting) : weightedPick(outfield, scorerWeights, roll, undefined, shooting);
}

/** Frispark er like mye teknikk som kraft. */
function freeKickSkill(player: ManagerPlayerSnapshot): number {
  return attributeOf(player, "shooting") * 0.7 + attributeOf(player, "passing") * 0.3;
}

/** Ferdigheten som avgjør hvor presist skytteren treffer i et nøkkeløyeblikk. */
export function momentSkill(player: ManagerPlayerSnapshot, kind: ShotKind): number {
  return kind === "freekick" ? freeKickSkill(player) : attributeOf(player, "shooting");
}

/**
 * Simulerer hele kampen minutt for minutt. Modellen er bevisst framoverrettet: et minutt
 * avhenger bare av laguttak, kort og bytter fra tidligere minutter, så et bytte senere i
 * kampen kan aldri skrive om noe som allerede er spilt.
 */
export function planManagerTimeline(matchId: string, events: unknown): ManagerMatchEvent[] {
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return Array.isArray(events) ? (events as ManagerMatchEvent[]) : [];
  const aimed = kickoff.version >= 5;
  // Fra versjon 5 finnes det ingen bytter: elleveren som starter, spiller hele kampen.
  const substitutions = aimed ? [] : getManagerSubstitutions(events);
  const sides: MatchSide[] = ["home", "away"];
  const sentOff = new Set<string>();
  const bookings = new Map<string, number>();
  const timeline: TimelineEvent[] = [];
  const shotSlots = new Map(aimed ? [] : plannedShotSlots(matchId).map((slot) => [slot.minute, slot.kind]));
  const moments = new Map(aimed ? plannedMoments(matchId, kickoff).map((moment) => [moment.minute, moment]) : []);
  const rated = kickoff.version >= 4;
  const attack = aimed ? ATTACK_VALUE : RATING_VALUE;
  const defence = aimed ? DEFENCE_VALUE : RATING_VALUE;
  const bonus = { home: kickoff.home.bonus ?? 0, away: kickoff.away.bonus ?? 0 };
  const onPitch = {
    home: minutesOnPitch(kickoff.home, substitutions.filter((event) => event.side === "home")),
    away: minutesOnPitch(kickoff.away, substitutions.filter((event) => event.side === "away")),
  };

  // En utslagskamp planlegges helt til 120′. Ekstraomgangene vises og telles bare hvis det står likt etter 90′.
  const lastMinute = kickoff.knockout ? EXTRA_TIME_END : 90;
  for (let minute = 1; minute <= lastMinute; minute += 1) {
    const active = {
      home: lineupAtMinute(kickoff.home, substitutions.filter((event) => event.side === "home"), minute).starters.filter((player) => !sentOff.has(player.id)),
      away: lineupAtMinute(kickoff.away, substitutions.filter((event) => event.side === "away"), minute).starters.filter((player) => !sentOff.has(player.id)),
    };

    for (const side of sides) {
      const opponent: MatchSide = side === "home" ? "away" : "home";
      const players = active[side];
      if (players.length === 0) continue;
      const roll = numberFromSeed(`${matchId}:${minute}:${side}:event`);
      let goalRate: number;
      let chanceRate: number;

      if (rated) {
        const edge = unitStrength(players, attackWeights, onPitch[side], minute, attack) + bonus[side] - unitStrength(active[opponent], defenceWeights, onPitch[opponent], minute, defence) - bonus[opponent];
        const attemptRate = aimed
          ? bounded(AIM_ATTEMPT_RATE * Math.exp(edge * ATTACK_SLOPE), 0.006, 0.05)
          : bounded(BASE_ATTEMPT_RATE * Math.exp(edge * ATTACK_SLOPE), 0.012, 0.15);
        goalRate = 0;
        chanceRate = attemptRate;
        if (roll < attemptRate) {
          const shooter = weightedPick(players, scorerWeights, numberFromSeed(`${matchId}:${minute}:${side}:scorer`), undefined, aimed ? shootingOf : undefined);
          if (!shooter) continue;
          const keeper = keeperOf(active[opponent]);
          const finish = numberFromSeed(`${matchId}:${minute}:${side}:finish`);
          const scoring = finishChance(shootingOf(shooter) + bonus[side], keeper.rating + bonus[opponent]);
          if (finish < scoring) {
            const assistCandidates = players.filter((player) => player.id !== shooter.id);
            const solo = numberFromSeed(`${matchId}:${minute}:${side}:solo`) < 0.22;
            const assist = solo ? null : weightedPick(assistCandidates, assistWeights, numberFromSeed(`${matchId}:${minute}:${side}:assist`), undefined, aimed ? (player) => attributeOf(player, "passing") : undefined);
            timeline.push({ type: "goal", minute, side, scorer: shooter.name, scorerId: shooter.id, assist: assist?.name ?? null, assistId: assist?.id ?? null });
          } else {
            // Det som ikke går inn, blir oftere en redning jo bedre keeperen er – ellers stolpen.
            const saveShare = bounded(0.62 + (keeper.rating + bonus[opponent] - shootingOf(shooter) - bonus[side]) * 0.01, 0.4, 0.85);
            const saved = (finish - scoring) / (1 - scoring) < saveShare;
            timeline.push({ type: "chance", minute, side, outcome: saved ? "save" : "post", player: shooter.name, playerId: shooter.id, keeper: saved ? keeper.name : null });
          }
          continue;
        }
      } else {
        const edge = (teamStrength(players, onPitch[side], minute) - teamStrength(active[opponent], onPitch[opponent], minute)) / 25;
        const attack = 1 + edge * 0.7;
        goalRate = bounded(BASE_GOAL_RATE * attack, 0.004, 0.06);
        chanceRate = bounded(BASE_CHANCE_RATE * attack, 0.01, 0.09);
      }

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

    const moment = moments.get(minute);
    if (moment) {
      const opponent: MatchSide = moment.side === "home" ? "away" : "home";
      const taker = momentTaker(matchId, minute, moment.side, moment.kind, active[moment.side]);
      if (taker) {
        const keeper = keeperOf(active[opponent]);
        const seed = `${matchId}:${minute}:${moment.side}:aim`;
        timeline.push({
          type: "shot", minute, side: moment.side, kind: moment.kind, takerId: taker.id, taker: taker.name, options: [], keeperId: keeper.id,
          radius: Math.round(aimRadius(moment.kind, momentSkill(taker, moment.kind) + bonus[moment.side]) * 10000) / 10000,
          keeperRating: keeper.rating + bonus[opponent],
          wall: moment.kind === "freekick" ? planWall(seed) : null,
          release: autoRelease(seed),
        });
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
      if (taker && rated) {
        const keeper = keeperOf(active[side === "home" ? "away" : "home"]);
        const options = shotOptions(shootingOf(taker));
        const reach = kind === "penalty" ? penaltyReach(keeper.rating + bonus[side === "home" ? "away" : "home"], shootingOf(taker), options.length) : 1;
        timeline.push({ type: "shot", minute, side, kind, takerId: taker.id, taker: taker.name, options, keeperId: keeper.id, reach });
      } else if (taker) {
        timeline.push({ type: "shot", minute, side, kind, takerId: taker.id, taker: taker.name, options: shotOptions(shootingOf(taker)) });
      }
    }
  }

  const shootout = kickoff.knockout
    ? planShootout(matchId, {
        home: lineupAtMinute(kickoff.home, substitutions.filter((event) => event.side === "home"), lastMinute + 1).starters.filter((player) => !sentOff.has(player.id)),
        away: lineupAtMinute(kickoff.away, substitutions.filter((event) => event.side === "away"), lastMinute + 1).starters.filter((player) => !sentOff.has(player.id)),
      })
    : [];
  return [kickoff, ...substitutions, ...timeline.sort(byMinute), ...shootout];
}

/** Sjansen for at et spark i straffekonkurransen går inn: skytteren mot keeperen, innenfor et realistisk spenn. */
export function shootoutKickChance(shooting: number, keeper: number): number {
  return bounded(0.76 + (shooting - 75) * 0.006 - (keeper - 70) * 0.006, 0.55, 0.92);
}

/**
 * Fem spark hver, med hjemmelaget først, og deretter sudden death. Den beste avslutteren tar
 * det første sparket og keeperen det siste; går runden lenger enn laget har spillere, begynner
 * rekka på nytt. Konkurransen stopper så snart det ene laget ikke lenger kan ta igjen det andre.
 */
function planShootout(matchId: string, active: Record<MatchSide, ManagerPlayerSnapshot[]>): ShootoutKick[] {
  const order = (players: ManagerPlayerSnapshot[]) =>
    [...players].sort((first, second) => Number(first.position === "GK") - Number(second.position === "GK") || shootingOf(second) - shootingOf(first) || first.name.localeCompare(second.name));
  const takers = { home: order(active.home), away: order(active.away) };
  if (!takers.home.length || !takers.away.length) return [];
  const keepers = { home: keeperOf(active.home), away: keeperOf(active.away) };
  const goals = { home: 0, away: 0 };
  const taken = { home: 0, away: 0 };
  const kicks: ShootoutKick[] = [];

  for (let round = 1; round <= 30; round += 1) {
    for (const side of ["home", "away"] as const) {
      const opponent: MatchSide = side === "home" ? "away" : "home";
      const taker = takers[side][(round - 1) % takers[side].length];
      // Etter 20 runder (praktisk talt aldri) avgjøres det, så lista alltid har en vinner.
      const scored = round > 20 ? side === "home" : numberFromSeed(`${matchId}:shootout:${round}:${side}`) < shootoutKickChance(shootingOf(taker), keepers[opponent].rating);
      kicks.push({ type: "shootout_kick", order: kicks.length + 1, round, side, takerId: taker.id, taker: taker.name, keeper: keepers[opponent].name, scored });
      taken[side] += 1;
      if (scored) goals[side] += 1;

      const decided = round <= 5
        ? goals.home + (5 - taken.home) < goals.away || goals.away + (5 - taken.away) < goals.home
        : taken.home === taken.away && goals.home !== goals.away;
      if (decided) return kicks;
    }
  }
  return kicks;
}

// ---------------------------------------------------------------------------
// Nøkkeløyeblikk
// ---------------------------------------------------------------------------

export function isAimShot(shot: TimelineShot): shot is AimShot {
  return typeof shot.radius === "number" && typeof shot.keeperRating === "number";
}

function isComputer(team: ManagerTeamSnapshot | undefined): boolean {
  return !team || team.userId.startsWith("ai:");
}

export function aimSeed(matchId: string, shot: TimelineShot): string {
  return `${matchId}:${shot.minute}:${shot.side}:aim`;
}

/** Om skytteren og keeperen i et øyeblikk styres av datamaskinen (en AI-klubb). */
export function momentControllers(events: unknown, shot: TimelineShot): { shooterIsComputer: boolean; keeperIsComputer: boolean } {
  const kickoff = getManagerKickoff(events);
  return { shooterIsComputer: isComputer(kickoff?.[shot.side]), keeperIsComputer: isComputer(kickoff?.[shot.side === "home" ? "away" : "home"]) };
}

/** Der skytteren sikter: det han valgte, det en datastyrt skytter velger, eller et slapt skudd om han ikke rakk det. */
export function momentAim(matchId: string, events: unknown, shot: AimShot, result: ShotResult | null): AimPoint {
  if (typeof result?.aimX === "number" && typeof result.aimY === "number") return clampAim({ x: result.aimX, y: result.aimY });
  return momentControllers(events, shot).shooterIsComputer ? autoAim(aimSeed(matchId, shot), shot.radius, shot.wall ?? null) : IDLE_AIM;
}

/** Keeperens kast: det managerens trykk, eller datakeeperens. En manager som ikke trykker, blir stående. */
export function momentTap(matchId: string, events: unknown, shot: AimShot, aim: AimPoint, result: ShotResult | null): KeeperTap | null {
  if (momentControllers(events, shot).keeperIsComputer) {
    const seed = aimSeed(matchId, shot);
    return autoKeeperTap(seed, ballTarget(seed, aim, shot.radius), shot.keeperRating);
  }
  if (typeof result?.saveX === "number" && typeof result.saveY === "number") return { x: result.saveX, y: result.saveY, ms: result.saveMs ?? 0 };
  return null;
}

/** Hele utfallet av et øyeblikk, regnet likt hos serveren og begge klientene. */
export function resolveMoment(matchId: string, events: unknown, shot: AimShot, result: ShotResult | null): AimResolution {
  const aim = momentAim(matchId, events, shot, result);
  const tap = momentTap(matchId, events, shot, aim, result);
  return resolveAim(aimSeed(matchId, shot), { kind: shot.kind, radius: shot.radius, keeper: shot.keeperRating, wall: shot.wall ?? null, aim, tap });
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
  })[0]?.name ?? null;

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
