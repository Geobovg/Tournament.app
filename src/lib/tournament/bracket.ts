import type { Pairing } from "./round-robin";

const ADVANCE_RATIO = 0.7;

export function knockoutCutoff(teamCount: number): number {
  if (teamCount < 2) return 0;
  return Math.min(teamCount, Math.max(2, Math.round(teamCount * ADVANCE_RATIO)));
}

export function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

export function seedOrder(bracketSize: number): number[] {
  let order = [1, 2];
  while (order.length < bracketSize) {
    const total = order.length * 2 + 1;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed, total - seed);
    }
    order = next;
  }
  return order;
}

export function generateFirstKnockoutRound(seededTeamIds: string[]): Pairing[] {
  if (seededTeamIds.length < 2) return [];

  const order = seedOrder(nextPowerOfTwo(seededTeamIds.length));
  const pairings: Pairing[] = [];

  for (let i = 0; i < order.length; i += 2) {
    const home = seededTeamIds[order[i] - 1] ?? null;
    const away = seededTeamIds[order[i + 1] - 1] ?? null;

    if (home && away) pairings.push({ homeTeamId: home, awayTeamId: away });
    else if (home) pairings.push({ homeTeamId: home, awayTeamId: null });
    else if (away) pairings.push({ homeTeamId: away, awayTeamId: null });
  }

  return pairings;
}

export function pairWinners(winnerTeamIds: string[]): Pairing[] {
  const pairings: Pairing[] = [];
  for (let i = 0; i < winnerTeamIds.length; i += 2) {
    const home = winnerTeamIds[i];
    const away = winnerTeamIds[i + 1] ?? null;
    pairings.push({ homeTeamId: home, awayTeamId: away });
  }
  return pairings;
}

export function roundLabel(teamsInRound: number): string {
  switch (teamsInRound) {
    case 2:
      return "Finale";
    case 4:
      return "Semifinale";
    case 8:
      return "Kvartfinale";
    case 16:
      return "Åttedelsfinale";
    case 32:
      return "Sekstendelsfinale";
    default:
      return `Sluttspillrunde (${teamsInRound} lag)`;
  }
}
