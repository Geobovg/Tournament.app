import type { Match, TournamentType } from "./types";

export type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  otLosses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  points: number;
};

type TeamRef = { id: string; name: string };

function emptyRow(team: TeamRef): StandingRow {
  return {
    teamId: team.id,
    teamName: team.name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    otLosses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    cleanSheets: 0,
    points: 0,
  };
}

export function playedMatches(matches: Match[]): Match[] {
  return matches.filter(
    (match) =>
      match.status === "confirmed" &&
      !match.is_bye &&
      match.home_team_id !== null &&
      match.away_team_id !== null,
  );
}

function resolveWinner(match: Match): string | null {
  if (match.winner_team_id) return match.winner_team_id;
  if (match.home_score === null || match.away_score === null) return null;
  if (match.home_score > match.away_score) return match.home_team_id;
  if (match.away_score > match.home_score) return match.away_team_id;
  return null;
}

function compareByPoints(a: StandingRow, b: StandingRow): number {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor
  );
}

function buildRows(
  teams: TeamRef[],
  matches: Match[],
  type: TournamentType,
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const team of teams) rows.set(team.id, emptyRow(team));

  for (const match of playedMatches(matches)) {
    const home = rows.get(match.home_team_id!);
    const away = rows.get(match.away_team_id!);
    if (!home || !away) continue;

    const homeScore = match.home_score ?? 0;
    const awayScore = match.away_score ?? 0;
    const winnerId = resolveWinner(match);

    for (const [row, scored, conceded] of [
      [home, homeScore, awayScore],
      [away, awayScore, homeScore],
    ] as const) {
      row.played += 1;
      row.goalsFor += scored;
      row.goalsAgainst += conceded;
      row.goalDifference = row.goalsFor - row.goalsAgainst;
      if (conceded === 0) row.cleanSheets += 1;
    }

    if (winnerId === null) {
      home.drawn += 1;
      away.drawn += 1;
      if (type === "fifa") {
        home.points += 1;
        away.points += 1;
      }
      continue;
    }

    const winner = winnerId === home.teamId ? home : away;
    const loser = winnerId === home.teamId ? away : home;
    winner.won += 1;

    if (type === "fifa") {
      winner.points += 3;
      loser.lost += 1;
    } else {
      winner.points += 2;
      if (match.result_type === "ot_so") {
        loser.otLosses += 1;
        loser.points += 1;
      } else {
        loser.lost += 1;
      }
    }
  }

  return [...rows.values()].sort(compareByPoints);
}

export function computeStandings(
  teams: TeamRef[],
  matches: Match[],
  type: TournamentType,
): StandingRow[] {
  const sorted = buildRows(teams, matches, type);
  const played = playedMatches(matches);
  const result: StandingRow[] = [];

  let start = 0;
  while (start < sorted.length) {
    let end = start + 1;
    while (end < sorted.length && compareByPoints(sorted[start], sorted[end]) === 0) {
      end += 1;
    }

    const group = sorted.slice(start, end);
    if (group.length > 1) {
      const groupIds = new Set(group.map((row) => row.teamId));
      const headToHead = buildRows(
        group.map((row) => ({ id: row.teamId, name: row.teamName })),
        played.filter(
          (match) =>
            groupIds.has(match.home_team_id!) && groupIds.has(match.away_team_id!),
        ),
        type,
      );
      const rank = new Map(headToHead.map((row, index) => [row.teamId, index]));
      group.sort(
        (a, b) =>
          (rank.get(a.teamId) ?? 0) - (rank.get(b.teamId) ?? 0) ||
          a.teamName.localeCompare(b.teamName, "nb"),
      );
    }

    result.push(...group);
    start = end;
  }

  return result;
}
