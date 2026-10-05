// Spesialkort (migrering 0060). Inform ligger i special_cards.kind i databasen; nye typer legges til der
// og her, og får egen stil på kortbildet. «personal» er de personlige kortene (migrering 0063), som har
// egen tabell, men vises med samme mekanikk.

export type SpecialKind = "inform" | "personal";

/** Fargene på et spesialkort: bakgrunn, kantlinje og teksten i merket. */
export const specialStyles: Record<SpecialKind, { background: string; border: string; badge: string; glow: string }> = {
  inform: {
    background: "radial-gradient(circle at 85% 0%, rgba(242,201,76,.45), transparent 42%), linear-gradient(155deg, #1b1b1b 0%, #050505 55%, #2a2108 100%)",
    border: "#d4af37",
    badge: "#f2c94c",
    glow: "#f2c94c",
  },
  personal: {
    background: "radial-gradient(circle at 15% 0%, rgba(126,249,255,.42), transparent 40%), radial-gradient(circle at 95% 100%, rgba(214,92,255,.45), transparent 45%), linear-gradient(160deg, #1a0b2e 0%, #0b0618 55%, #062a33 100%)",
    border: "#b9f6ff",
    badge: "#7ef9ff",
    glow: "#c46bff",
  },
};

export function isSpecialKind(value: unknown): value is SpecialKind {
  return typeof value === "string" && value in specialStyles;
}
