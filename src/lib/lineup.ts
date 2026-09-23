export type Formation = "4-3-3" | "4-2-3-1" | "4-4-2" | "3-5-2" | "4-3-1-2";

export type FormationSlot = { position: string; x: number; y: number };

export const formations: Record<Formation, FormationSlot[]> = {
  "4-3-3": [
    { position: "GK", x: 50, y: 90 }, { position: "LB", x: 15, y: 74 }, { position: "CB", x: 38, y: 78 }, { position: "CB", x: 62, y: 78 }, { position: "RB", x: 85, y: 74 },
    { position: "CM", x: 26, y: 55 }, { position: "CM", x: 50, y: 60 }, { position: "CM", x: 74, y: 55 }, { position: "LW", x: 18, y: 30 }, { position: "ST", x: 50, y: 20 }, { position: "RW", x: 82, y: 30 },
  ],
  "4-2-3-1": [
    { position: "GK", x: 50, y: 90 }, { position: "LB", x: 15, y: 74 }, { position: "CB", x: 38, y: 78 }, { position: "CB", x: 62, y: 78 }, { position: "RB", x: 85, y: 74 },
    { position: "CDM", x: 35, y: 59 }, { position: "CDM", x: 65, y: 59 }, { position: "LW", x: 18, y: 40 }, { position: "CAM", x: 50, y: 42 }, { position: "RW", x: 82, y: 40 }, { position: "ST", x: 50, y: 20 },
  ],
  "4-4-2": [
    { position: "GK", x: 50, y: 90 }, { position: "LB", x: 15, y: 74 }, { position: "CB", x: 38, y: 78 }, { position: "CB", x: 62, y: 78 }, { position: "RB", x: 85, y: 74 },
    { position: "LM", x: 15, y: 50 }, { position: "CM", x: 38, y: 56 }, { position: "CM", x: 62, y: 56 }, { position: "RM", x: 85, y: 50 }, { position: "ST", x: 36, y: 25 }, { position: "ST", x: 64, y: 25 },
  ],
  "3-5-2": [
    { position: "GK", x: 50, y: 90 }, { position: "CB", x: 28, y: 77 }, { position: "CB", x: 50, y: 80 }, { position: "CB", x: 72, y: 77 },
    { position: "LM", x: 12, y: 54 }, { position: "CM", x: 32, y: 56 }, { position: "CDM", x: 50, y: 62 }, { position: "CM", x: 68, y: 56 }, { position: "RM", x: 88, y: 54 }, { position: "ST", x: 36, y: 25 }, { position: "ST", x: 64, y: 25 },
  ],
  "4-3-1-2": [
    { position: "GK", x: 50, y: 90 }, { position: "LB", x: 15, y: 74 }, { position: "CB", x: 38, y: 78 }, { position: "CB", x: 62, y: 78 }, { position: "RB", x: 85, y: 74 },
    { position: "CM", x: 26, y: 57 }, { position: "CM", x: 50, y: 61 }, { position: "CM", x: 74, y: 57 }, { position: "CAM", x: 50, y: 42 }, { position: "ST", x: 36, y: 23 }, { position: "ST", x: 64, y: 23 },
  ],
};

export const formationNames = Object.keys(formations) as Formation[];

const positionGroups = [
  ["GK"], ["CB"], ["LB", "LWB"], ["RB", "RWB"], ["CDM", "CM", "CAM"], ["LW", "RW", "LM", "RM"], ["ST", "SA"],
];

export function canPlayPosition(naturalPosition: string, targetPosition: string) {
  return positionGroups.some((group) => group.includes(naturalPosition) && group.includes(targetPosition));
}

type SelectableCard = { id: string; position: string; overall: number };

export function pickBestLineup<T extends SelectableCard>(cards: T[], formation: Formation) {
  const remaining = [...cards].sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id));
  const starters: string[] = [];
  for (const slot of formations[formation]) {
    const matchIndex = remaining.findIndex((card) => canPlayPosition(card.position, slot.position));
    const fallbackIndex = matchIndex === -1 ? 0 : matchIndex;
    const picked = remaining.splice(fallbackIndex, 1)[0];
    if (picked) starters.push(picked.id);
  }
  return { starters, bench: remaining.slice(0, 7).map((card) => card.id) };
}

export function rearrangeLineup<T extends SelectableCard>(cards: T[], formation: Formation, currentStarters: string[], currentBench: string[]) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const preferred = currentStarters.map((id) => byId.get(id)).filter((card): card is T => Boolean(card)).sort((a, b) => b.overall - a.overall);
  const others = cards.filter((card) => !currentStarters.includes(card.id)).sort((a, b) => b.overall - a.overall);
  const remaining = [...preferred, ...others];
  const starters: string[] = [];
  for (const slot of formations[formation]) {
    const matchIndex = remaining.findIndex((card) => canPlayPosition(card.position, slot.position));
    const picked = remaining.splice(matchIndex === -1 ? 0 : matchIndex, 1)[0];
    if (picked) starters.push(picked.id);
  }
  const selected = new Set(starters);
  const bench = [...currentBench, ...currentStarters, ...cards.map((card) => card.id)].filter((id, index, all) => !selected.has(id) && all.indexOf(id) === index).slice(0, 7);
  return { starters, bench };
}
