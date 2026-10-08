// Spesialkort (migrering 0060). Inform, TOTS (0065) og Icons (0074) ligger i special_cards.kind i databasen; nye typer legges til der
// og her, og får egen stil på kortbildet. «personal» er de personlige kortene (migrering 0063), som har
// egen tabell, men vises med samme mekanikk.

export type SpecialKind = "inform" | "tots" | "icon" | "personal";

/** Fargene på et spesialkort: bakgrunn, kantlinje og teksten i merket. */
export const specialStyles: Record<SpecialKind, { background: string; border: string; badge: string; glow: string }> = {
  inform: {
    background: "radial-gradient(circle at 85% 0%, rgba(242,201,76,.45), transparent 42%), linear-gradient(155deg, #1b1b1b 0%, #050505 55%, #2a2108 100%)",
    border: "#d4af37",
    badge: "#f2c94c",
    glow: "#f2c94c",
  },
  // Team of the Season, som i FC: mørk marineblå med lyseblått lys fra øvre hjørne og gullkant.
  tots: {
    background: "radial-gradient(circle at 85% 0%, rgba(110,200,255,.55), transparent 42%), radial-gradient(circle at 10% 100%, rgba(212,175,55,.22), transparent 38%), linear-gradient(160deg, #0c2a5c 0%, #061433 55%, #020817 100%)",
    border: "#e2bd52",
    badge: "#8fd6ff",
    glow: "#5cc8ff",
  },
  // Icons, som i FC: perlehvitt lys og gull. Bunnen er mørk gullbrun, så den hvite teksten på kortet kan leses.
  icon: {
    background: "radial-gradient(circle at 80% 0%, rgba(255,255,255,.85), rgba(255,246,220,.35) 22%, transparent 46%), radial-gradient(circle at 0% 100%, rgba(212,175,55,.35), transparent 40%), linear-gradient(165deg, #b89a5e 0%, #7a5f2e 32%, #3d2d12 68%, #1c1406 100%)",
    border: "#f6e7b8",
    badge: "#fff4d1",
    glow: "#ffe9a8",
  },
  // Inspirert av FUTTIES i FC: sommerlig rosa, oransje og gult, med solstråler fra øvre hjørne.
  personal: {
    background: "repeating-conic-gradient(from 200deg at 88% 6%, rgba(255,255,255,.16) 0deg 7deg, transparent 7deg 18deg), radial-gradient(circle at 88% 6%, rgba(255,250,200,.75), transparent 34%), linear-gradient(165deg, #ff2e93 0%, #ff5f6d 38%, #ff9a3c 70%, #ffd23f 100%)",
    border: "#fff6a8",
    badge: "#fff35c",
    glow: "#ff2e93",
  },
};

export function isSpecialKind(value: unknown): value is SpecialKind {
  return typeof value === "string" && value in specialStyles;
}
