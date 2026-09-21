export type ManagerPlayerSnapshot = { id: string; name: string; position: string; overall: number };
export type ManagerTeamSnapshot = { userId: string; formation: string; starters: ManagerPlayerSnapshot[]; bench: ManagerPlayerSnapshot[] };
export type ManagerKickoffEvent = { type: "kickoff"; version: 1; home: ManagerTeamSnapshot; away: ManagerTeamSnapshot };
export type ManagerSubstitutionEvent = { type: "substitution"; side: "home" | "away"; outId: string; inId: string; minute: 45 };
export type ManagerFullTimeEvent = { type: "full_time"; minute: 90; homeScore: number; awayScore: number };
export type ManagerMatchEvent = ManagerKickoffEvent | ManagerSubstitutionEvent | ManagerFullTimeEvent;
export type ManagerTactic = { mentality?: string; press?: string; focus?: string };
export type ManagerTactics = Record<string, Record<string, ManagerTactic>>;
export type TimelineGoal = { type: "goal"; minute: number; side: "home" | "away"; scorer: string };

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

export function scoreAtMinute(goals: TimelineGoal[], minute: number) {
  return goals.filter((goal) => goal.minute <= minute).reduce((score, goal) => ({ home: score.home + (goal.side === "home" ? 1 : 0), away: score.away + (goal.side === "away" ? 1 : 0) }), { home: 0, away: 0 });
}
