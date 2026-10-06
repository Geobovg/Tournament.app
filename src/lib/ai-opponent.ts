import { formations } from "./lineup";
import { derivedAttributes, type ManagerPlayerSnapshot, type ManagerTeamSnapshot } from "./manager-match";

/** `bonus` er den skjulte styrken AI-klubbene får fra arena 2 (se arenas.ts). Eldre sesonger har den ikke. */
export type AiTeam = { key: string; name: string; rating: number; bonus?: number };

const firstNames = ["James", "Liam", "Oliver", "Harry", "Jack", "Charlie", "Thomas", "George", "Oscar", "William", "Noah", "Ethan", "Leo", "Mason", "Lucas", "Ryan", "Callum", "Daniel", "Joe", "Kieran"];
const lastNames = ["Carter", "Walsh", "Bennett", "Hughes", "Turner", "Parker", "Collins", "Morgan", "Reid", "Foster", "Hayes", "Barnes", "Cooper", "Ward", "Fletcher", "Doyle", "Murphy", "Price", "Shaw", "Holloway"];

/** Enkel deterministisk tallgenerator, så samme AI-klubb får samme spillere hver gang. */
function seeded(seed: string) {
  let state = 0;
  for (const char of seed) state = (Math.imul(state, 31) + char.charCodeAt(0)) | 0;
  return () => {
    state = (Math.imul(state ^ (state >>> 15), 2246822507) + 0x9e3779b9) | 0;
    return ((state >>> 0) % 10000) / 10000;
  };
}

/**
 * Laguttaket til en AI-klubb: 4-3-3 med oppdiktede spillere spredt rundt klubbens rating.
 * I arena 1 er hver spiller maks 95 som før, fra arena 2 kan de være opptil 99.
 */
export function aiTeamSnapshot(seasonId: string, team: AiTeam, maxOverall = 95): ManagerTeamSnapshot {
  const random = seeded(`${seasonId}:${team.key}`);
  const player = (index: number, position: string): ManagerPlayerSnapshot => {
    const name = `${firstNames[Math.floor(random() * firstNames.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`;
    const overall = Math.max(45, Math.min(maxOverall, team.rating + Math.round(random() * 6 - 3)));
    // Attributtene følger samme regel som katalogkortene, så en AI-spiss skyter som en spiss.
    return { id: `ai:${team.key}:${index}`, name, position, overall, attributes: derivedAttributes(position, overall), slug: null, club: team.name, accent: null };
  };
  const starters = formations["4-3-3"].map((slot, index) => player(index, slot.position));
  const bench = ["GK", "CB", "CM", "ST"].map((position, index) => player(11 + index, position));
  return { userId: `ai:${team.key}`, formation: "4-3-3", starters, bench, ...(team.bonus ? { bonus: team.bonus } : {}) };
}
