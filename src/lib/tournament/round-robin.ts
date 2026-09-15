export type Pairing = {
  homeTeamId: string;
  awayTeamId: string | null;
};

export function generateRoundRobin(teamIds: string[]): Pairing[][] {
  if (teamIds.length < 2) return [];

  const slots: (string | null)[] = [...teamIds];
  if (slots.length % 2 === 1) slots.push(null);

  const n = slots.length;
  const rounds: Pairing[][] = [];

  for (let round = 0; round < n - 1; round++) {
    const pairings: Pairing[] = [];

    for (let i = 0; i < n / 2; i++) {
      const first = slots[i];
      const second = slots[n - 1 - i];

      if (first === null || second === null) {
        const playing = first ?? second;
        if (playing !== null) {
          pairings.push({ homeTeamId: playing, awayTeamId: null });
        }
        continue;
      }

      const [home, away] = round % 2 === 0 ? [first, second] : [second, first];
      pairings.push({ homeTeamId: home, awayTeamId: away });
    }

    rounds.push(pairings);

    const [fixed, ...rest] = slots;
    rest.unshift(rest.pop()!);
    slots.splice(0, slots.length, fixed, ...rest);
  }

  return rounds;
}
