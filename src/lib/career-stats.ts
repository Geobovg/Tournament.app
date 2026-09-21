export const STAT_GROUPS = {
  Pace: ["acceleration", "sprintSpeed", "agility", "tempo"],
  Skudd: ["finishing", "shotPower", "longShots", "volleys"],
  Pasning: ["longPassing", "shortPassing", "crossing", "curve"],
  Dribling: ["ballControl", "dribbling", "vision", "balance"],
  Forsvar: ["standingTackle", "slidingTackle", "heading", "interceptions"],
  Fysikk: ["jumping", "stamina", "strength", "passion"],
} as const;

export type StatKey = (typeof STAT_GROUPS)[keyof typeof STAT_GROUPS][number];
export const ALL_STATS = Object.values(STAT_GROUPS).flat() as StatKey[];
export const STAT_LABELS: Record<StatKey, string> = {
  acceleration: "Akselerasjon", sprintSpeed: "Spurtehastighet", agility: "Smidighet", tempo: "Spilltempo", finishing: "Avslutning", shotPower: "Skuddkraft", longShots: "Langskudd", volleys: "Volley", longPassing: "Langpasning", shortPassing: "Kortpasning", crossing: "Innlegg", curve: "Skru", ballControl: "Ballkontroll", dribbling: "Dribling", vision: "Spillforståelse", balance: "Balanse", standingTackle: "Stående takling", slidingTackle: "Sklitakling", heading: "Heading", interceptions: "Pasningsbrudd", jumping: "Spenst", stamina: "Utholdenhet", strength: "Styrke", passion: "Passion",
};
export type CareerProfile = { user_id: string; player_name: string; primary_position: "forward" | "midfielder" | "defender"; player_points: number; player_points_earned: number; manager_budget: number; manager_budget_earned: number; club_name: string; appearance: Record<string, unknown>; club_style: Record<string, unknown>; stats: Record<StatKey, number>; tournament_wins: number; tournament_draws: number; tournament_losses: number; player_career_wins: number; player_career_draws: number; player_career_losses: number; manager_career_wins: number; manager_career_draws: number; manager_career_losses: number };
export function upgradeCost(value: number) { return value >= 95 ? 5 : value >= 85 ? 3 : value >= 70 ? 2 : 1; }
export function groupRating(stats: Record<StatKey, number>, group: keyof typeof STAT_GROUPS) { const values = STAT_GROUPS[group].map((key) => stats[key] ?? 50); return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length); }
export function overallRating(profile: CareerProfile) { const groups = Object.fromEntries(Object.keys(STAT_GROUPS).map((group) => [group, groupRating(profile.stats, group as keyof typeof STAT_GROUPS)])) as Record<keyof typeof STAT_GROUPS, number>; const weights = profile.primary_position === "forward" ? { Pace: .18, Skudd: .28, Pasning: .12, Dribling: .2, Forsvar: .04, Fysikk: .18 } : profile.primary_position === "defender" ? { Pace: .12, Skudd: .05, Pasning: .13, Dribling: .12, Forsvar: .34, Fysikk: .24 } : { Pace: .13, Skudd: .13, Pasning: .27, Dribling: .23, Forsvar: .1, Fysikk: .14 }; return Math.round(Object.entries(weights).reduce((sum, [group, weight]) => sum + groups[group as keyof typeof STAT_GROUPS] * weight, 0)); }
