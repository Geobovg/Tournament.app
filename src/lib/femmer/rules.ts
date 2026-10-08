// Reglene i Femmer (migrering 0075, uten pakker og mynter fra 0079). Fila brukes både på serveren og i nettleseren.

export const FIVE_START_OVERALL = 70;
export const FIVE_STARTERS = 5;
export const FIVE_BENCH = 5;

/** Rollen til en plass: forsvar, midtbane eller angrep. Plass 0 er alltid keeper. */
export type FiveRole = "GK" | "D" | "M" | "A";
export type FiveFormation = "1-2-1" | "2-2" | "3-1" | "1-1-2";
export type FiveSlot = { role: FiveRole; x: number; y: number };

// x og y er prosent av banen, med eget mål nederst. Rader som står rett bak hverandre, har minst 22 i avstand,
// ellers ligger kortene oppå hverandre på smale mobiler.
export const fiveFormations: Record<FiveFormation, FiveSlot[]> = {
  "1-2-1": [{ role: "GK", x: 50, y: 90 }, { role: "D", x: 50, y: 68 }, { role: "M", x: 20, y: 46 }, { role: "M", x: 80, y: 46 }, { role: "A", x: 50, y: 22 }],
  "2-2": [{ role: "GK", x: 50, y: 90 }, { role: "D", x: 28, y: 66 }, { role: "D", x: 72, y: 66 }, { role: "A", x: 28, y: 28 }, { role: "A", x: 72, y: 28 }],
  "3-1": [{ role: "GK", x: 50, y: 90 }, { role: "D", x: 12, y: 62 }, { role: "D", x: 50, y: 68 }, { role: "D", x: 88, y: 62 }, { role: "A", x: 50, y: 26 }],
  "1-1-2": [{ role: "GK", x: 50, y: 90 }, { role: "D", x: 50, y: 68 }, { role: "M", x: 50, y: 46 }, { role: "A", x: 26, y: 24 }, { role: "A", x: 74, y: 24 }],
};
export const fiveFormationNames = Object.keys(fiveFormations) as FiveFormation[];
export function isFiveFormation(value: unknown): value is FiveFormation {
  return typeof value === "string" && value in fiveFormations;
}

/** AI-stigen har 30 trinn. Ratingen til AI-laget stiger jevnt fra 63 til 98. */
export const FIVE_AI_LEVELS = 30;
export function fiveAiRating(level: number) {
  return Math.min(98, Math.round(62 + Math.max(1, level) * 1.2));
}

export const FIVE_SEASON_MAX_MEMBERS = 16;

/**
 * Posisjonen eieren har valgt for kortet. Spiller kortet på en annen plass, blir det svakere i kampen:
 * litt mellom utespillerplassene, mye mellom mål og ute.
 */
export const fivePositions = ["GK", "D", "M", "A"] as const;
export type FivePosition = (typeof fivePositions)[number];
export function isFivePosition(value: unknown): value is FivePosition {
  return typeof value === "string" && (fivePositions as readonly string[]).includes(value);
}
export function fivePositionPenalty(position: FivePosition | null, role: FiveRole) {
  if (position === role) return 0;
  if (position === "GK" || role === "GK") return 15;
  return position === null ? 6 : 4;
}

/** Erfaring per kamp. 100 xp gir +1 rating (se record_five_match). */
export const FIVE_XP = { starter: 15, bench: 8, goal: 10, assist: 5, win: 10 } as const;
export const FIVE_XP_PER_LEVEL = 100;
