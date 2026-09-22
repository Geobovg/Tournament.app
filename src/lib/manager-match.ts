export type ManagerPlayerSnapshot = { id: string; name: string; position: string; overall: number };
export type ManagerTeamSnapshot = { userId: string; formation: string; starters: ManagerPlayerSnapshot[]; bench: ManagerPlayerSnapshot[] };
export type ManagerKickoffEvent = { type: "kickoff"; version: 1; home: ManagerTeamSnapshot; away: ManagerTeamSnapshot };
export type ManagerSubstitutionEvent = { type: "substitution"; side: "home" | "away"; outId: string; inId: string; minute: 45 };
export type ManagerFullTimeEvent = { type: "full_time"; minute: 90; homeScore: number; awayScore: number };
export type ManagerTactic = { mentality?: string; press?: string; focus?: string };
export type ManagerTactics = Record<string, Record<string, ManagerTactic>>;
export type TimelineGoal = { type: "goal"; minute: number; side: "home" | "away"; scorer: string };
export type ManagerMatchEvent = ManagerKickoffEvent | ManagerSubstitutionEvent | ManagerFullTimeEvent | TimelineGoal;
export type ManagerMatchReport = {
  home: { strength: number; possession: number; shots: number; onTarget: number };
  away: { strength: number; possession: number; shots: number; onTarget: number };
  playerOfMatch: string;
};

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
  return kickoff?.version === 1 && isTeam(kickoff.home) && isTeam(kickoff.away) ? kickoff as ManagerKickoffEvent : null;
}

export function getManagerSubstitutions(events: unknown): ManagerSubstitutionEvent[] {
  if (!Array.isArray(events)) return [];
  return events.filter((event): event is ManagerSubstitutionEvent => Boolean(event) && typeof event === "object" && (event as Record<string, unknown>).type === "substitution" && ((event as Record<string, unknown>).side === "home" || (event as Record<string, unknown>).side === "away") && typeof (event as Record<string, unknown>).outId === "string" && typeof (event as Record<string, unknown>).inId === "string");
}

function isTimelineGoal(value: unknown): value is TimelineGoal {
  if (!value || typeof value !== "object") return false;
  const goal = value as Record<string, unknown>;
  return goal.type === "goal" && Number.isInteger(goal.minute) && Number(goal.minute) >= 1 && Number(goal.minute) <= 90 && (goal.side === "home" || goal.side === "away") && typeof goal.scorer === "string";
}

export function getManagerGoals(events: unknown): TimelineGoal[] {
  if (!Array.isArray(events)) return [];
  return events.filter(isTimelineGoal).sort((first, second) => first.minute - second.minute || first.side.localeCompare(second.side));
}

export function teamAfterSubstitutions(events: unknown, side: "home" | "away"): ManagerTeamSnapshot | null {
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return null;
  const initial = kickoff[side];
  const starters = [...initial.starters];
  const bench = [...initial.bench];
  for (const substitution of getManagerSubstitutions(events).filter((event) => event.side === side)) {
    const starterIndex = starters.findIndex((player) => player.id === substitution.outId);
    const benchIndex = bench.findIndex((player) => player.id === substitution.inId);
    if (starterIndex < 0 || benchIndex < 0) continue;
    starters[starterIndex] = bench[benchIndex];
    bench.splice(benchIndex, 1);
  }
  return { ...initial, starters, bench };
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

function tacticValue(tactic: ManagerTactic | undefined): number {
  if (!tactic) return 0;
  return (tactic.mentality === "attacking" ? .28 : tactic.mentality === "defensive" ? -.18 : 0) + (tactic.press === "high" ? .12 : tactic.press === "low" ? -.1 : 0) + (tactic.focus === "counter" ? .07 : tactic.focus === "wings" ? .04 : 0);
}

function goalsForSegment(matchId: string, segment: number, side: "home" | "away", team: ManagerTeamSnapshot, opponent: ManagerTeamSnapshot, tactic: ManagerTactic | undefined, start: number, end: number): TimelineGoal[] {
  const duration = end - start + 1;
  const ratingEdge = (averageOverall(team) - averageOverall(opponent)) / 25;
  const expected = Math.max(.05, (duration / 90) * (1.4 * (1 + ratingEdge * .7) + tacticValue(tactic)));
  const count = Math.min(3, Math.max(0, Math.floor(expected + numberFromSeed(`${matchId}:${segment}:${side}:count`))));
  const candidates = team.starters.filter((player) => player.position !== "GK");
  return Array.from({ length: count }, (_, index) => {
    const minute = Math.min(end, start + Math.floor(numberFromSeed(`${matchId}:${segment}:${side}:minute:${index}`) * duration));
    const scorer = candidates[Math.floor(numberFromSeed(`${matchId}:${segment}:${side}:scorer:${index}`) * candidates.length)] ?? team.starters[0];
    return { type: "goal", minute, side, scorer: scorer?.name ?? "Ukjent spiller" };
  });
}

export function simulateManagerTimeline(matchId: string, events: unknown, tactics: ManagerTactics | null | undefined): TimelineGoal[] {
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return [];
  const secondHalfHome = teamAfterSubstitutions(events, "home") ?? kickoff.home;
  const secondHalfAway = teamAfterSubstitutions(events, "away") ?? kickoff.away;
  const choices = tactics ?? {};
  const segments = [
    { start: 1, end: 29, home: kickoff.home, away: kickoff.away, moment: undefined },
    { start: 30, end: 44, home: kickoff.home, away: kickoff.away, moment: "30" },
    { start: 45, end: 59, home: secondHalfHome, away: secondHalfAway, moment: "45" },
    { start: 60, end: 90, home: secondHalfHome, away: secondHalfAway, moment: "60" },
  ] as const;
  const goals = segments.flatMap((segment, index) => [
    ...goalsForSegment(matchId, index, "home", segment.home, segment.away, segment.moment ? choices[kickoff.home.userId]?.[segment.moment] : undefined, segment.start, segment.end),
    ...goalsForSegment(matchId, index, "away", segment.away, segment.home, segment.moment ? choices[kickoff.away.userId]?.[segment.moment] : undefined, segment.start, segment.end),
  ]);
  return goals.sort((first, second) => first.minute - second.minute || first.side.localeCompare(second.side));
}

/** Persists the deterministic parts of the timeline so cron can settle a match without a browser. */
export function replanManagerTimeline(matchId: string, events: unknown, tactics: ManagerTactics | null | undefined, fromMinute: number): ManagerMatchEvent[] {
  const retained = Array.isArray(events) ? events.filter((event) => !isTimelineGoal(event) || event.minute < fromMinute) : [];
  const replanned = simulateManagerTimeline(matchId, events, tactics).filter((goal) => goal.minute >= fromMinute);
  return [...retained, ...replanned] as ManagerMatchEvent[];
}

function bounded(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function tacticsFor(tactics: ManagerTactics | null | undefined, userId: string) {
  return Object.values(tactics?.[userId] ?? {});
}

function averageTacticValue(tactics: ManagerTactic[]) {
  if (!tactics.length) return 0;
  return tactics.reduce((total, tactic) => total + tacticValue(tactic), 0) / tactics.length;
}

/** A deterministic report, so both managers see the same post-match stats. */
export function getManagerMatchReport(matchId: string, events: unknown, tactics: ManagerTactics | null | undefined): ManagerMatchReport | null {
  const kickoff = getManagerKickoff(events);
  if (!kickoff) return null;
  const homeTeam = teamAfterSubstitutions(events, "home") ?? kickoff.home;
  const awayTeam = teamAfterSubstitutions(events, "away") ?? kickoff.away;
  const goals = getManagerGoals(events);
  const homeGoals = goals.filter((goal) => goal.side === "home").length;
  const awayGoals = goals.filter((goal) => goal.side === "away").length;
  const homeTactics = averageTacticValue(tacticsFor(tactics, kickoff.home.userId));
  const awayTactics = averageTacticValue(tacticsFor(tactics, kickoff.away.userId));
  const homeStrength = averageOverall(homeTeam);
  const awayStrength = averageOverall(awayTeam);
  const homePossession = Math.round(bounded(50 + (homeStrength - awayStrength) * 0.72 + (homeTactics - awayTactics) * 4 + (numberFromSeed(`${matchId}:possession`) - .5) * 4, 34, 66));
  const homeShots = Math.max(homeGoals + 1, Math.round(bounded(6 + (homeStrength - 60) * .16 + homeTactics * 3 + numberFromSeed(`${matchId}:home:shots`) * 4, 4, 18)));
  const awayShots = Math.max(awayGoals + 1, Math.round(bounded(6 + (awayStrength - 60) * .16 + awayTactics * 3 + numberFromSeed(`${matchId}:away:shots`) * 4, 4, 18)));
  const homeOnTarget = Math.max(homeGoals, Math.min(homeShots, Math.round(homeShots * (.42 + numberFromSeed(`${matchId}:home:on-target`) * .16))));
  const awayOnTarget = Math.max(awayGoals, Math.min(awayShots, Math.round(awayShots * (.42 + numberFromSeed(`${matchId}:away:on-target`) * .16))));
  const goalCounts = new Map<string, number>();
  for (const goal of goals) goalCounts.set(goal.scorer, (goalCounts.get(goal.scorer) ?? 0) + 1);
  const playerOfMatch = [...homeTeam.starters, ...awayTeam.starters].sort((first, second) => {
    const firstScore = first.overall + (goalCounts.get(first.name) ?? 0) * 20;
    const secondScore = second.overall + (goalCounts.get(second.name) ?? 0) * 20;
    return secondScore - firstScore || first.name.localeCompare(second.name);
  })[0]?.name ?? "Kampens spiller";
  return {
    home: { strength: Math.round(homeStrength), possession: homePossession, shots: homeShots, onTarget: homeOnTarget },
    away: { strength: Math.round(awayStrength), possession: 100 - homePossession, shots: awayShots, onTarget: awayOnTarget },
    playerOfMatch,
  };
}

export function scoreAtMinute(goals: TimelineGoal[], minute: number) {
  return goals.filter((goal) => goal.minute <= minute).reduce((score, goal) => ({ home: score.home + (goal.side === "home" ? 1 : 0), away: score.away + (goal.side === "away" ? 1 : 0) }), { home: 0, away: 0 });
}
