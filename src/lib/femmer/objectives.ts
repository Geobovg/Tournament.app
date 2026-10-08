import "server-only";

import { supabaseAdmin } from "../supabase/server";
import { osloToday } from "./data";

/**
 * Utfordringene i Femmer. Daglige nullstilles ved midnatt (norsk tid), ukentlige fredag kl. 18
 * sammen med inform-runden. Bare kamper man spilte selv teller. Premien er mynter, en pakke
 * og/eller et garantert inform-kort fra ukens runde.
 */
export type FiveObjectiveMetric = "played" | "wins" | "goals" | "cleanSheets" | "aiWins" | "social";
export type FiveObjective = { key: string; period: "daily" | "weekly"; metric: FiveObjectiveMetric; target: number; coins: number; packCards: number; inform: boolean };

export const fiveObjectives: FiveObjective[] = [
  { key: "d_play3", period: "daily", metric: "played", target: 3, coins: 40, packCards: 0, inform: false },
  { key: "d_win2", period: "daily", metric: "wins", target: 2, coins: 50, packCards: 0, inform: false },
  { key: "d_goals6", period: "daily", metric: "goals", target: 6, coins: 0, packCards: 1, inform: false },
  { key: "w_win10", period: "weekly", metric: "wins", target: 10, coins: 0, packCards: 3, inform: false },
  { key: "w_clean3", period: "weekly", metric: "cleanSheets", target: 3, coins: 125, packCards: 0, inform: false },
  { key: "w_ai5", period: "weekly", metric: "aiWins", target: 5, coins: 150, packCards: 0, inform: false },
  { key: "w_social3", period: "weekly", metric: "social", target: 3, coins: 100, packCards: 0, inform: false },
  { key: "w_goals30", period: "weekly", metric: "goals", target: 30, coins: 0, packCards: 0, inform: true },
];

export type FiveObjectiveStatus = FiveObjective & { progress: number; claimed: boolean; periodStart: string; resetsAt: string };

/** Midnatt norsk tid for datoen, som et tidspunkt. Prøver begge mulige tidsforskjeller (vinter/sommer). */
function osloMidnight(date: string) {
  for (const offset of ["+01:00", "+02:00"]) {
    const candidate = new Date(`${date}T00:00:00${offset}`);
    if (osloToday(candidate) === date && osloToday(new Date(candidate.getTime() - 1)) !== date) return candidate;
  }
  return new Date(`${date}T00:00:00+01:00`);
}

export async function fivePeriods() {
  const { data, error } = await supabaseAdmin().rpc("sbc_week_bounds");
  if (error) throw new Error(error.message);
  const dayStart = osloMidnight(osloToday());
  const nextDay = osloMidnight(osloToday(new Date(dayStart.getTime() + 26 * 3_600_000)));
  return {
    daily: { start: dayStart.toISOString(), end: nextDay.toISOString() },
    weekly: { start: new Date(data.week_start).toISOString(), end: new Date(data.next_reset).toISOString() },
  };
}

export async function getFiveObjectives(userId: string): Promise<FiveObjectiveStatus[]> {
  const periods = await fivePeriods();
  const db = supabaseAdmin();
  const [{ data: matches, error }, { data: claims, error: claimsError }] = await Promise.all([
    db.from("five_matches").select("kind, home_user_id, home_score, away_score, completed_at").eq("controller_id", userId).eq("status", "completed").gte("completed_at", periods.weekly.start < periods.daily.start ? periods.weekly.start : periods.daily.start),
    db.from("five_objective_claims").select("objective, period_start").eq("user_id", userId).in("period_start", [periods.daily.start, periods.weekly.start]),
  ]);
  if (error || claimsError) throw new Error(error?.message ?? claimsError?.message);
  const measure = (since: string, metric: FiveObjectiveMetric) => (matches ?? []).filter((match) => new Date(match.completed_at).getTime() >= new Date(since).getTime()).reduce((sum, match) => {
    const home = match.home_user_id === userId;
    const scored = home ? match.home_score : match.away_score;
    const conceded = home ? match.away_score : match.home_score;
    if (metric === "played") return sum + 1;
    if (metric === "wins") return sum + Number(scored > conceded);
    if (metric === "goals") return sum + scored;
    if (metric === "cleanSheets") return sum + Number(conceded === 0);
    if (metric === "aiWins") return sum + Number(match.kind === "ai" && scored > conceded);
    return sum + Number(match.kind !== "ai");
  }, 0);
  const claimed = new Set((claims ?? []).map((claim) => `${claim.objective}:${new Date(claim.period_start).toISOString()}`));
  return fiveObjectives.map((objective) => {
    const period = periods[objective.period];
    return { ...objective, progress: Math.min(objective.target, measure(period.start, objective.metric)), claimed: claimed.has(`${objective.key}:${period.start}`), periodStart: period.start, resetsAt: period.end };
  });
}
