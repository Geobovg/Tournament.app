// Arenaene i AI-sesongen. Hver arena har ti divisjoner, så stigen er 50 nivåer lang.
// Tallene speiles i SQL-funksjonene i migrering 0062 (ai_division_rating, ai_team_offsets,
// ai_arena_bonus, ai_arena_factor og finish_ai_season). Endres ett sted, må det andre følge.

export type ArenaNumber = 1 | 2 | 3 | 4 | 5;

export type Arena = {
  number: ArenaNumber;
  /** Ekte stadionnavn. De oversettes ikke. */
  name: string;
  /** Fargetemaet på sesong- og kampskjermen: hovedfarge, glød og mørk bunn. */
  colors: { primary: string; glow: string; base: string };
  /** AI-ratingen i divisjon 10 og divisjon 1. Divisjonene imellom fordeles jevnt. */
  rating: { bottom: number; top: number };
  /** Avvik fra divisjonsratingen for de fem AI-klubbene. Jevnere jo høyere arena. */
  offsets: [number, number, number, number, number];
  /** Skjult styrke i kampmodellen. Vises ikke som rating. */
  bonus: number;
  /** Premiepenger og klubb-XP ganges med denne. */
  factor: number;
  /** Inform-sjansen i vanlige pakker ganges med denne. */
  informFactor: number;
  /** Antall pakker for et opprykk innenfor arenaen. */
  promotionPacks: number;
  /** Første gang man når arenaen. Arena 1 har ingen. */
  unlock: { mb: number; packs: { key: string; count: number }[] } | null;
};

export const arenas: Arena[] = [
  { number: 1, name: "Gamle Gress", colors: { primary: "#98ff2c", glow: "rgba(152,255,44,.18)", base: "#07111a" }, rating: { bottom: 58, top: 84 }, offsets: [-2, -1, 0, 1, 5], bonus: 0, factor: 1, informFactor: 1, promotionPacks: 1, unlock: null },
  { number: 2, name: "Ullevaal", colors: { primary: "#ff4d5e", glow: "rgba(255,77,94,.2)", base: "#140a10" }, rating: { bottom: 82, top: 87 }, offsets: [-2, -1, 0, 1, 3], bonus: 1, factor: 1.5, informFactor: 1.05, promotionPacks: 1, unlock: { mb: 300, packs: [{ key: "elite", count: 1 }] } },
  { number: 3, name: "Wembley Stadium", colors: { primary: "#5cc8ff", glow: "rgba(92,200,255,.2)", base: "#07101c" }, rating: { bottom: 86, top: 90 }, offsets: [-1, 0, 0, 1, 2], bonus: 2, factor: 2, informFactor: 1.1, promotionPacks: 2, unlock: { mb: 500, packs: [{ key: "inform", count: 1 }] } },
  { number: 4, name: "Old Trafford", colors: { primary: "#ff2b2b", glow: "rgba(255,43,43,.22)", base: "#160707" }, rating: { bottom: 88, top: 94 }, offsets: [-1, 0, 1, 1, 2], bonus: 3, factor: 2.5, informFactor: 1.15, promotionPacks: 2, unlock: { mb: 750, packs: [{ key: "inform", count: 1 }] } },
  { number: 5, name: "Camp Nou", colors: { primary: "#f2c94c", glow: "rgba(242,201,76,.22)", base: "#0b0a1c" }, rating: { bottom: 91, top: 97 }, offsets: [0, 0, 1, 1, 2], bonus: 4, factor: 3, informFactor: 1.25, promotionPacks: 3, unlock: { mb: 1000, packs: [{ key: "inform", count: 2 }] } },
];

export const lastArena = arenas.length as ArenaNumber;

export function arenaOf(number: number): Arena {
  return arenas[Math.min(Math.max(Math.round(number), 1), arenas.length) - 1];
}

/** AI-ratingen for en divisjon i en arena: jevnt fordelt fra divisjon 10 til divisjon 1. */
export function divisionRating(arena: number, division: number): number {
  const { rating } = arenaOf(arena);
  return rating.bottom + Math.round(((rating.top - rating.bottom) * (10 - division)) / 9);
}

/** Like mange elitepakker som arenanummeret når man vinner divisjon 1. */
export const divisionOneWinElitePacks = (arena: number) => arenaOf(arena).number;

/** AI-spillerne i arena 1 er maks 95 som før. Fra arena 2 kan de være opptil 99. */
export const aiPlayerMaxOverall = (arena: number) => (arena <= 1 ? 95 : 99);
