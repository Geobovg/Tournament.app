import { formations } from "./lineup";
import type { ManagerPlayerSnapshot, ManagerTeamSnapshot } from "./manager-match";

export type AiTeam = { key: string; name: string; rating: number };

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

/** Laguttaket til en AI-klubb: 4-3-3 med oppdiktede spillere spredt rundt klubbens rating. */
export function aiTeamSnapshot(seasonId: string, team: AiTeam): ManagerTeamSnapshot {
  const random = seeded(`${seasonId}:${team.key}`);
  const player = (index: number, position: string): ManagerPlayerSnapshot => ({
    id: `ai:${team.key}:${index}`,
    name: `${firstNames[Math.floor(random() * firstNames.length)]} ${lastNames[Math.floor(random() * lastNames.length)]}`,
    position,
    overall: Math.max(45, Math.min(95, team.rating + Math.round(random() * 6 - 3))),
    slug: null,
    club: team.name,
    accent: null,
  });
  const starters = formations["4-3-3"].map((slot, index) => player(index, slot.position));
  const bench = ["GK", "CB", "CM", "ST"].map((position, index) => player(11 + index, position));
  return { userId: `ai:${team.key}`, formation: "4-3-3", starters, bench };
}
