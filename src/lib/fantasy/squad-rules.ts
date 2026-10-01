// Reglene for et fantasy-lag, som i Premier League Fantasy. Brukes både i
// lagbyggeren (for å vise hva som mangler) og på serveren før laget lagres.

export type FantasyPosition = "GK" | "DEF" | "MID" | "FWD";
export const FANTASY_POSITIONS: readonly FantasyPosition[] = ["GK", "DEF", "MID", "FWD"];

export const SQUAD_SIZE = 15;
export const STARTERS = 11;
// 100,0 mill. i tideler. Startbudsjettet for et nytt lag.
export const BUDGET = 1000;
export const MAX_PER_CLUB = 3;
export const SQUAD_SHAPE: Record<FantasyPosition, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
// Minst og maks antall i startelleveren per posisjon.
export const STARTING_LIMITS: Record<FantasyPosition, [number, number]> = { GK: [1, 1], DEF: [3, 5], MID: [2, 5], FWD: [1, 3] };

// price er det spilleren koster laget nå: dagens pris for nye spillere, salgsprisen for
// spillere man allerede eier (se sellingPrice).
export type SquadPlayer = { id: number; position: FantasyPosition; price: number; clubId: number };

// Salgspris som i Premier League Fantasy, samme som fantasy_selling_price i 0049_fantasy_rounds.sql:
// har prisen gått opp, får du halve økningen (rundet ned). Har den gått ned, får du dagens pris.
export function sellingPrice(purchase: number, current: number) {
  return current <= purchase ? current : purchase + Math.floor((current - purchase) / 2);
}

// Pengene laget har å bruke: banken + salgsverdien av spillerne man eier. Et nytt lag har 100,0 mill.
export function availableMoney(bank: number | null, owned: readonly { purchase: number; current: number }[]) {
  if (bank === null) return BUDGET;
  return bank + owned.reduce((sum, player) => sum + sellingPrice(player.purchase, player.current), 0);
}

export type SquadProblem =
  | { type: "position"; position: FantasyPosition; have: number; need: number }
  | { type: "budget"; over: number }
  | { type: "club"; clubId: number; count: number }
  | { type: "duplicate" };

export function squadCost(players: readonly SquadPlayer[]) {
  return players.reduce((sum, player) => sum + player.price, 0);
}

export function countBy<T extends string | number>(values: readonly T[]) {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

// Hva som er galt med troppen på 15. Tom liste betyr at den er gyldig.
export function squadProblems(players: readonly SquadPlayer[], budget = BUDGET): SquadProblem[] {
  const problems: SquadProblem[] = [];
  if (new Set(players.map((player) => player.id)).size !== players.length) problems.push({ type: "duplicate" });
  const byPosition = countBy(players.map((player) => player.position));
  for (const position of FANTASY_POSITIONS) {
    const have = byPosition.get(position) ?? 0;
    if (have !== SQUAD_SHAPE[position]) problems.push({ type: "position", position, have, need: SQUAD_SHAPE[position] });
  }
  const cost = squadCost(players);
  if (cost > budget) problems.push({ type: "budget", over: cost - budget });
  for (const [clubId, count] of countBy(players.map((player) => player.clubId))) {
    if (count > MAX_PER_CLUB) problems.push({ type: "club", clubId, count });
  }
  return problems;
}

// Om en spiller til kan legges i troppen uten å bryte reglene.
export function canAddPlayer(squad: readonly SquadPlayer[], player: SquadPlayer, budget = BUDGET) {
  if (squad.length >= SQUAD_SIZE || squad.some((picked) => picked.id === player.id)) return false;
  if (squad.filter((picked) => picked.position === player.position).length >= SQUAD_SHAPE[player.position]) return false;
  if (squad.filter((picked) => picked.clubId === player.clubId).length >= MAX_PER_CLUB) return false;
  return squadCost(squad) + player.price <= budget;
}

export type Lineup = { starters: number[]; bench: number[]; captainId: number; viceCaptainId: number };

export type LineupProblem =
  | { type: "starterCount"; have: number }
  | { type: "formation"; position: FantasyPosition; have: number; min: number; max: number }
  | { type: "notInSquad" }
  | { type: "captain" };

// Om startelleveren, benken og kapteinene passer til troppen.
export function lineupProblems(squad: readonly SquadPlayer[], lineup: Lineup): LineupProblem[] {
  const problems: LineupProblem[] = [];
  const byId = new Map(squad.map((player) => [player.id, player]));
  const all = [...lineup.starters, ...lineup.bench];
  if (all.length !== squad.length || new Set(all).size !== all.length || all.some((id) => !byId.has(id))) problems.push({ type: "notInSquad" });
  if (lineup.starters.length !== STARTERS) problems.push({ type: "starterCount", have: lineup.starters.length });
  const byPosition = countBy(lineup.starters.flatMap((id) => (byId.has(id) ? [byId.get(id)!.position] : [])));
  for (const position of FANTASY_POSITIONS) {
    const have = byPosition.get(position) ?? 0;
    const [min, max] = STARTING_LIMITS[position];
    if (have < min || have > max) problems.push({ type: "formation", position, have, min, max });
  }
  const captainsOk = lineup.captainId !== lineup.viceCaptainId && lineup.starters.includes(lineup.captainId) && lineup.starters.includes(lineup.viceCaptainId);
  if (!captainsOk) problems.push({ type: "captain" });
  return problems;
}

// En gyldig startellever for en ferdig tropp: keeper, 4 forsvarere, 4 midtbane og
// 2 angripere (4-4-2), de dyreste først. Kaptein er den dyreste, visekaptein den nest dyreste.
export function defaultLineup(squad: readonly SquadPlayer[]): Lineup {
  const take: Record<FantasyPosition, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };
  const sorted = [...squad].sort((a, b) => b.price - a.price);
  const starters: number[] = [];
  for (const player of sorted) {
    if (take[player.position] > 0) {
      starters.push(player.id);
      take[player.position] -= 1;
    }
  }
  // Benken: reservekeeperen først, så de dyreste utespillerne.
  const rest = sorted.filter((player) => !starters.includes(player.id));
  const bench = [...rest.filter((player) => player.position === "GK"), ...rest.filter((player) => player.position !== "GK")].map((player) => player.id);
  const outfield = sorted.filter((player) => starters.includes(player.id));
  return { starters, bench, captainId: outfield[0]?.id ?? 0, viceCaptainId: outfield[1]?.id ?? 0 };
}
