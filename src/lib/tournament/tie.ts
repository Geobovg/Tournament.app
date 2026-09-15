import type { Match, TournamentType } from "./types";

export type TieState = {
  decided: boolean;
  winnerTeamId: string | null;
  needsExtraLeg: boolean;
};

const UNDECIDED: TieState = {
  decided: false,
  winnerTeamId: null,
  needsExtraLeg: false,
};

export function resolveTie(legs: Match[], type: TournamentType): TieState {
  const ordered = [...legs].sort((a, b) => a.leg_number - b.leg_number);
  if (ordered.length === 0) return UNDECIDED;

  const bye = ordered.find((match) => match.is_bye);
  if (bye) {
    return { decided: true, winnerTeamId: bye.home_team_id, needsExtraLeg: false };
  }

  if (!ordered.every((match) => match.status === "confirmed")) return UNDECIDED;

  if (ordered.length === 1) {
    return {
      decided: ordered[0].winner_team_id !== null,
      winnerTeamId: ordered[0].winner_team_id,
      needsExtraLeg: false,
    };
  }

  if (type === "nhl") {
    const wins = new Map<string, number>();
    for (const leg of ordered) {
      if (!leg.winner_team_id) continue;
      wins.set(leg.winner_team_id, (wins.get(leg.winner_team_id) ?? 0) + 1);
    }
    for (const [teamId, count] of wins) {
      if (count >= 2) {
        return { decided: true, winnerTeamId: teamId, needsExtraLeg: false };
      }
    }
    return { decided: false, winnerTeamId: null, needsExtraLeg: true };
  }

  const aggregate = new Map<string, number>();
  for (const leg of ordered) {
    if (leg.home_team_id) {
      aggregate.set(
        leg.home_team_id,
        (aggregate.get(leg.home_team_id) ?? 0) + (leg.home_score ?? 0),
      );
    }
    if (leg.away_team_id) {
      aggregate.set(
        leg.away_team_id,
        (aggregate.get(leg.away_team_id) ?? 0) + (leg.away_score ?? 0),
      );
    }
  }

  const ranked = [...aggregate.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 2 && ranked[0][1] !== ranked[1][1]) {
    return { decided: true, winnerTeamId: ranked[0][0], needsExtraLeg: false };
  }

  const finalLeg = ordered[ordered.length - 1];
  return {
    decided: finalLeg.winner_team_id !== null,
    winnerTeamId: finalLeg.winner_team_id,
    needsExtraLeg: false,
  };
}
