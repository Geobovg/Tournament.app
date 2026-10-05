export type Formation = "4-3-3" | "4-2-3-1" | "4-4-2" | "3-5-2" | "4-3-1-2";

export type FormationSlot = { position: string; x: number; y: number };

export const formations: Record<Formation, FormationSlot[]> = {
  "4-3-3": [
    { position: "GK", x: 50, y: 93 }, { position: "LB", x: 15, y: 74 }, { position: "CB", x: 38, y: 78 }, { position: "CB", x: 62, y: 78 }, { position: "RB", x: 85, y: 74 },
    { position: "CM", x: 26, y: 55 }, { position: "CM", x: 50, y: 59 }, { position: "CM", x: 74, y: 55 }, { position: "LW", x: 18, y: 30 }, { position: "ST", x: 50, y: 20 }, { position: "RW", x: 82, y: 30 },
  ],
  "4-2-3-1": [
    { position: "GK", x: 50, y: 93 }, { position: "LB", x: 15, y: 74 }, { position: "CB", x: 38, y: 78 }, { position: "CB", x: 62, y: 78 }, { position: "RB", x: 85, y: 74 },
    { position: "CDM", x: 35, y: 59 }, { position: "CDM", x: 65, y: 59 }, { position: "LW", x: 18, y: 40 }, { position: "CAM", x: 50, y: 42 }, { position: "RW", x: 82, y: 40 }, { position: "ST", x: 50, y: 17 },
  ],
  "4-4-2": [
    { position: "GK", x: 50, y: 93 }, { position: "LB", x: 15, y: 74 }, { position: "CB", x: 38, y: 78 }, { position: "CB", x: 62, y: 78 }, { position: "RB", x: 85, y: 74 },
    { position: "LM", x: 15, y: 50 }, { position: "CM", x: 38, y: 56 }, { position: "CM", x: 62, y: 56 }, { position: "RM", x: 85, y: 50 }, { position: "ST", x: 36, y: 25 }, { position: "ST", x: 64, y: 25 },
  ],
  "3-5-2": [
    { position: "GK", x: 50, y: 93 }, { position: "CB", x: 28, y: 77 }, { position: "CB", x: 50, y: 76 }, { position: "CB", x: 72, y: 77 },
    { position: "LM", x: 12, y: 54 }, { position: "CM", x: 32, y: 56 }, { position: "CDM", x: 50, y: 57 }, { position: "CM", x: 68, y: 56 }, { position: "RM", x: 88, y: 54 }, { position: "ST", x: 36, y: 25 }, { position: "ST", x: 64, y: 25 },
  ],
  "4-3-1-2": [
    { position: "GK", x: 50, y: 93 }, { position: "LB", x: 15, y: 74 }, { position: "CB", x: 38, y: 78 }, { position: "CB", x: 62, y: 78 }, { position: "RB", x: 85, y: 74 },
    { position: "CM", x: 26, y: 57 }, { position: "CM", x: 50, y: 63 }, { position: "CM", x: 74, y: 57 }, { position: "CAM", x: 50, y: 41 }, { position: "ST", x: 34, y: 23 }, { position: "ST", x: 66, y: 23 },
  ],
};

export const formationNames = Object.keys(formations) as Formation[];

const positionGroups = [
  ["GK"], ["CB"], ["LB", "LWB"], ["RB", "RWB"], ["CDM", "CM", "CAM"], ["LW", "RW", "LM", "RM"], ["ST", "SA"],
];

// Personlige kort (migrering 0063) har denne posisjonen og kan spille hvor som helst.
export const anyPosition = "ALL";

export function canPlayPosition(naturalPosition: string, targetPosition: string) {
  return naturalPosition === anyPosition || positionGroups.some((group) => group.includes(naturalPosition) && group.includes(targetPosition));
}

type SelectableCard = { id: string; position: string; overall: number };

// Fyller plassene fra puljene i rekkefølge. I hver pulje får kortene med fast posisjon velge først,
// så et kort som kan spille alt ikke tar keeperplassen fra keeperen. Det settes inn der det trengs etterpå.
function fillSlots<T extends SelectableCard>(slots: FormationSlot[], pools: T[][]) {
  const lineup: (T | null)[] = slots.map(() => null);
  const left = pools.map((pool) => [...pool]);
  for (const pool of left) {
    for (const versatile of [false, true]) {
      slots.forEach((slot, index) => {
        if (lineup[index]) return;
        const matchIndex = pool.findIndex((card) => (card.position === anyPosition) === versatile && canPlayPosition(card.position, slot.position));
        if (matchIndex >= 0) lineup[index] = pool.splice(matchIndex, 1)[0];
      });
    }
  }
  // Ingen kort passer: da står beste ledige kort der likevel, som før.
  const rest = left.flat();
  lineup.forEach((card, index) => { if (!card && rest.length) lineup[index] = rest.shift()!; });
  return { lineup, rest };
}

export function pickBestLineup<T extends SelectableCard>(cards: T[], formation: Formation) {
  const sorted = [...cards].sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id));
  const slots = formations[formation];
  const { lineup, rest } = fillSlots(slots, [sorted.filter((card) => card.position !== anyPosition)]);
  // Kort som kan spille alt, tar plassen til den svakeste i elleveren (eller en som står feil) når det er bedre.
  // En keeper som står i mål, byttes ikke ut automatisk; vil man ha kortet i mål, kan man flytte det dit selv.
  const strength = (card: T | null, index: number) => (!card || !canPlayPosition(card.position, slots[index].position) ? -1 : slots[index].position === "GK" ? Infinity : card.overall);
  for (const versatile of sorted.filter((card) => card.position === anyPosition)) {
    const weakest = lineup.reduce((best, card, index) => (strength(card, index) < strength(lineup[best], best) ? index : best), 0);
    if (versatile.overall > strength(lineup[weakest], weakest)) {
      const replaced = lineup[weakest];
      lineup[weakest] = versatile;
      if (replaced) rest.push(replaced);
    } else rest.push(versatile);
  }
  rest.sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id));
  return { starters: lineup.filter((card): card is T => Boolean(card)).map((card) => card.id), bench: rest.slice(0, 7).map((card) => card.id) };
}

export function rearrangeLineup<T extends SelectableCard>(cards: T[], formation: Formation, currentStarters: string[], currentBench: string[]) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const preferred = currentStarters.map((id) => byId.get(id)).filter((card): card is T => Boolean(card)).sort((a, b) => b.overall - a.overall);
  const others = cards.filter((card) => !currentStarters.includes(card.id)).sort((a, b) => b.overall - a.overall);
  const starters = fillSlots(formations[formation], [preferred, others]).lineup.filter((card): card is T => Boolean(card)).map((card) => card.id);
  const selected = new Set(starters);
  const bench = [...currentBench, ...currentStarters, ...cards.map((card) => card.id)].filter((id, index, all) => !selected.has(id) && all.indexOf(id) === index).slice(0, 7);
  return { starters, bench };
}

// «Velg beste tropp» ser på hele klubben, ikke bare kortene som allerede står i
// troppen: elleveren fylles posisjon for posisjon, benken og reservene tar de
// nest beste. Resten av kortene hører hjemme på lageret.
export function pickBestSquad<T extends SelectableCard>(cards: T[], formation: Formation, capacity: number) {
  const { starters, bench } = pickBestLineup(cards, formation);
  const chosen = new Set([...starters, ...bench]);
  const reserves = cards
    .filter((card) => !chosen.has(card.id))
    .sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, capacity - chosen.size))
    .map((card) => card.id);
  return { starters, bench, reserves, squad: [...starters, ...bench, ...reserves] };
}
