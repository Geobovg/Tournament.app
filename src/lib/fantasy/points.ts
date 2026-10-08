// Poengreglene i Fantasy, som i Premier League Fantasy. Ingen importer (bare typer), så
// fila kan brukes både av appen og av skriptene i scripts/.
//
// Endres reglene her, bør anslaget i pricing.ts (estimatedPoints) og regelsiden
// (t.fantasy.rules) endres samtidig.

import type { FantasyPosition } from "./squad-rules";

export const POINTS = {
  minutesUnder60: 1,
  minutes60: 2,
  goal: { GK: 10, DEF: 6, MID: 5, FWD: 4 } as Record<FantasyPosition, number>,
  assist: 3,
  cleanSheet: { GK: 4, DEF: 4, MID: 1, FWD: 0 } as Record<FantasyPosition, number>,
  savesPerPoint: 3,
  penaltySaved: 5,
  penaltyMissed: -2,
  // GK og DEF: -1 for hver andre baklengsmål mens spilleren var på banen.
  concededPerMinusPoint: 2,
  yellowCard: -1,
  redCard: -3,
  ownGoal: -2,
  // Defensive bidrag (nytt i FPL 2025/26): +2 for minst så mange taklinger, blokkeringer og
  // brytninger i én kamp. FPL teller også klareringer (og ballvinninger for MID/FWD) og krever
  // 10/12, men de tallene får vi ikke fra API-Football, så grensene er lavere.
  defensiveContribution: { points: 2, threshold: { GK: null, DEF: 6, MID: 7, FWD: 7 } as Record<FantasyPosition, number | null> },
  bonus: [3, 2, 1],
} as const;

// Én spillers tall i én kamp (se fixture-lines.ts for hvordan de hentes fra API-Football).
export type PlayerFixtureLine = {
  playerId: number;
  teamId: number;
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  // Baklengsmål mens spilleren var på banen.
  goalsConceded: number;
  // Taklinger + blokkeringer + brytninger.
  defensiveActions: number;
  rating: number | null;
};

export type PointsBreakdown = {
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: number;
  saves: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  goalsConceded: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  // Mangler i poeng regnet ut før defensive bidrag kom med.
  defensiveContribution?: number;
  bonus: number;
};

export function scoreLine(position: FantasyPosition, line: PlayerFixtureLine, bonus: number): { total: number; breakdown: PointsBreakdown } {
  const played = line.minutes > 0;
  const threshold = POINTS.defensiveContribution.threshold[position];
  const breakdown: PointsBreakdown = {
    minutes: !played ? 0 : line.minutes >= 60 ? POINTS.minutes60 : POINTS.minutesUnder60,
    goals: line.goals * POINTS.goal[position],
    assists: line.assists * POINTS.assist,
    // Clean sheet krever minst 60 minutter og ingen baklengsmål mens spilleren var på banen.
    cleanSheet: line.minutes >= 60 && line.goalsConceded === 0 ? POINTS.cleanSheet[position] : 0,
    saves: position === "GK" ? Math.floor(line.saves / POINTS.savesPerPoint) : 0,
    penaltiesSaved: line.penaltiesSaved * POINTS.penaltySaved,
    penaltiesMissed: line.penaltiesMissed * POINTS.penaltyMissed,
    goalsConceded: position === "GK" || position === "DEF" ? -Math.floor(line.goalsConceded / POINTS.concededPerMinusPoint) : 0,
    // Andre gule kort gir rødt: da teller bare det røde, som i Premier League Fantasy.
    yellowCards: line.redCards > 0 ? 0 : line.yellowCards * POINTS.yellowCard,
    redCards: line.redCards > 0 ? POINTS.redCard : 0,
    ownGoals: line.ownGoals * POINTS.ownGoal,
    defensiveContribution: threshold !== null && line.defensiveActions >= threshold ? POINTS.defensiveContribution.points : 0,
    bonus: played ? bonus : 0,
  };
  const total = Object.values(breakdown).reduce((sum, value) => sum + (value ?? 0), 0);
  return { total, breakdown };
}

// Bonuspoeng 3-2-1 til de tre spillerne med best karakter i kampen (begge lag), som en
// erstatning for Premier League Fantasy sitt eget BPS-system. Ved likhet får alle med
// samme karakter like mange poeng, og plassene etter hoppes over, slik som i FPL.
export function fixtureBonus(lines: readonly PlayerFixtureLine[]): Map<number, number> {
  const rated = lines.filter((line) => line.minutes > 0 && line.rating !== null).sort((a, b) => b.rating! - a.rating!);
  const bonus = new Map<number, number>();
  let place = 0;
  let index = 0;
  while (index < rated.length && place < POINTS.bonus.length) {
    const rating = rated[index].rating;
    const tied = rated.filter((line) => line.rating === rating);
    for (const line of tied) bonus.set(line.playerId, POINTS.bonus[place]);
    index += tied.length;
    place += tied.length;
  }
  return bonus;
}

export type Chip = "wildcard" | "free_hit" | "bench_boost" | "triple_captain";
export const CHIPS: readonly Chip[] = ["wildcard", "free_hit", "bench_boost", "triple_captain"];

// En spiller i laget i én runde. done betyr at alle kampene hans i runden er ferdige
// (eller at laget hans ikke spiller i runden), så vi vet om han fikk spille.
export type RoundPlayer = { playerId: number; position: FantasyPosition; points: number; minutes: number; done: boolean };

export type RoundLine = { playerId: number; slot: number; points: number; multiplier: number; subbedIn: boolean; subbedOut: boolean };
export type TeamRoundResult = { points: number; benchPoints: number; captainId: number | null; lines: RoundLine[] };

const FORMATION_MIN: Record<FantasyPosition, number> = { GK: 1, DEF: 3, MID: 2, FWD: 1 };

// Poengene til ett lag i én runde: automatiske innbyttere, kaptein (eller visekaptein),
// chips og minuspoeng for ekstra bytter. Plass 1–11 er startelleveren, 12–15 benken i rekkefølge.
export function teamRoundPoints(input: {
  picks: readonly { playerId: number; slot: number }[];
  captainId: number;
  viceCaptainId: number;
  chip: Chip | null;
  transferCost: number;
  players: ReadonlyMap<number, RoundPlayer>;
}): TeamRoundResult {
  const empty: RoundPlayer = { playerId: 0, position: "MID", points: 0, minutes: 0, done: true };
  const player = (id: number) => input.players.get(id) ?? { ...empty, playerId: id };
  const sorted = [...input.picks].sort((a, b) => a.slot - b.slot);
  const starters = sorted.filter((pick) => pick.slot <= 11).map((pick) => pick.playerId);
  const bench = sorted.filter((pick) => pick.slot > 11).map((pick) => pick.playerId);
  const benchBoost = input.chip === "bench_boost";
  const subbedIn = new Set<number>();
  const subbedOut = new Set<number>();
  const playing = [...starters];

  // Automatiske innbyttere: en i startelleveren som ikke spilte (og er ferdig), byttes med
  // første på benken som spilte, så lenge formasjonen fortsatt er gyldig. Keeper bare med keeper.
  // Som i FPL gjelder benkrekkefølgen: har en benkespiller som kan komme inn ikke spilt ennå,
  // venter vi på ham i stedet for å hoppe til neste på benken.
  if (!benchBoost) {
    for (const starterId of starters) {
      const starter = player(starterId);
      if (starter.minutes > 0 || !starter.done) continue;
      for (const benchId of bench) {
        if (subbedIn.has(benchId)) continue;
        const candidate = player(benchId);
        if ((starter.position === "GK") !== (candidate.position === "GK")) continue;
        const after = playing.map((id) => (id === starterId ? benchId : id));
        const counts = new Map<FantasyPosition, number>();
        for (const id of after) counts.set(player(id).position, (counts.get(player(id).position) ?? 0) + 1);
        const valid = (Object.keys(FORMATION_MIN) as FantasyPosition[]).every((position) => (counts.get(position) ?? 0) >= FORMATION_MIN[position]);
        if (!valid) continue;
        if (candidate.minutes === 0) {
          if (candidate.done) continue;
          break;
        }
        playing[playing.indexOf(starterId)] = benchId;
        subbedIn.add(benchId);
        subbedOut.add(starterId);
        break;
      }
    }
  }

  // Visekapteinen tar over bare når kapteinen er ferdig uten å ha spilt.
  const captain = player(input.captainId);
  const vice = player(input.viceCaptainId);
  const captainMissed = captain.minutes === 0 && captain.done;
  const captainId = !captainMissed ? input.captainId : vice.minutes > 0 || !vice.done ? input.viceCaptainId : null;
  const captainMultiplier = input.chip === "triple_captain" ? 3 : 2;

  const counting = new Set(benchBoost ? [...starters, ...bench] : playing);
  const lines: RoundLine[] = sorted.map((pick) => {
    const counts = counting.has(pick.playerId);
    const multiplier = !counts ? 0 : pick.playerId === captainId ? captainMultiplier : 1;
    return { playerId: pick.playerId, slot: pick.slot, points: player(pick.playerId).points, multiplier, subbedIn: subbedIn.has(pick.playerId), subbedOut: subbedOut.has(pick.playerId) };
  });
  const points = lines.reduce((sum, line) => sum + line.points * line.multiplier, 0) - input.transferCost;
  const benchPoints = lines.filter((line) => line.multiplier === 0).reduce((sum, line) => sum + line.points, 0);
  return { points, benchPoints, captainId, lines };
}
