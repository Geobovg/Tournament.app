// Spesialkort (migrering 0060). Foreløpig finnes bare inform; nye typer legges til her og i
// special_cards.kind i databasen, og får egen stil på kortbildet.

export type SpecialKind = "inform";

/** Fargene på et spesialkort: bakgrunn, kantlinje og teksten i merket. */
export const specialStyles: Record<SpecialKind, { background: string; border: string; badge: string; glow: string }> = {
  inform: {
    background: "radial-gradient(circle at 85% 0%, rgba(242,201,76,.45), transparent 42%), linear-gradient(155deg, #1b1b1b 0%, #050505 55%, #2a2108 100%)",
    border: "#d4af37",
    badge: "#f2c94c",
    glow: "#f2c94c",
  },
};

export function isSpecialKind(value: unknown): value is SpecialKind {
  return typeof value === "string" && value in specialStyles;
}
