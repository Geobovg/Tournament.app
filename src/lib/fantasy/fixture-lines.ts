// Gjør en kamp fra API-Football om til tall per spiller (PlayerFixtureLine), som poengene
// regnes ut fra. Ingen importer (bare typer), så skriptene i scripts/ kan bruke den.

import type { ApiFixtureDetails } from "./api-football";
import type { PlayerFixtureLine } from "./points";

// Statuser der kampen er ferdig og tallene ikke endrer seg mer (bortsett fra rettelser).
export const FINISHED_STATUSES = ["FT", "AET", "PEN"];
// Statuser der kampen ikke blir spilt som planlagt.
export const CANCELLED_STATUSES = ["PST", "CANC", "ABD", "AWD", "WO"];
export const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"];

// Minuttet en hendelse skjedde, med tilleggstid som desimal så rekkefølgen blir riktig.
const at = (time: { elapsed: number | null; extra: number | null }) => (time.elapsed ?? 0) + (time.extra ?? 0) / 100;

export function fixtureLines(details: ApiFixtureDetails): PlayerFixtureLine[] {
  const homeId = details.teams.home.id;
  const awayId = details.teams.away.id;
  const opponent = (teamId: number) => (teamId === homeId ? awayId : homeId);

  const teamOf = new Map<number, number>();
  for (const team of details.players) for (const entry of team.players) teamOf.set(entry.player.id, team.team.id);

  // Når hver spiller kom inn og gikk ut. Startelleveren er på fra minutt 0.
  const onFrom = new Map<number, number>();
  const offAt = new Map<number, number>();
  const hasLineups = details.lineups.some((lineup) => lineup.startXI.length > 0);
  for (const lineup of details.lineups) for (const { player } of lineup.startXI) onFrom.set(player.id, 0);
  const onPitch = (id: number) => onFrom.has(id) && !offAt.has(id);
  const events = [...details.events].sort((a, b) => at(a.time) - at(b.time));
  const ownGoals = new Map<number, number>();
  const goals: { minute: number; teamId: number }[] = [];
  for (const event of events) {
    const minute = at(event.time);
    const playerId = event.player.id;
    if (event.type === "subst" && playerId !== null && event.assist.id !== null) {
      // API-et er ikke konsekvent på hvem som er «player» og «assist» i et bytte, så vi
      // ser på hvem som allerede er på banen.
      const [out, into] = onPitch(playerId) ? [playerId, event.assist.id] : [event.assist.id, playerId];
      offAt.set(out, minute);
      onFrom.set(into, minute);
    } else if (event.type === "Card" && event.detail === "Red Card" && playerId !== null) {
      offAt.set(playerId, minute);
    } else if (event.type === "Goal" && event.detail !== "Missed Penalty" && playerId !== null) {
      const scorerTeam = teamOf.get(playerId) ?? event.team.id;
      if (event.detail === "Own Goal") {
        ownGoals.set(playerId, (ownGoals.get(playerId) ?? 0) + 1);
        goals.push({ minute, teamId: opponent(scorerTeam) });
      } else {
        goals.push({ minute, teamId: scorerTeam });
      }
    }
  }

  const lines: PlayerFixtureLine[] = [];
  for (const team of details.players) {
    const teamGoalsAgainst = team.team.id === homeId ? details.goals.away ?? 0 : details.goals.home ?? 0;
    for (const entry of team.players) {
      const stats = entry.statistics[0];
      if (!stats) continue;
      const id = entry.player.id;
      const minutes = stats.games.minutes ?? 0;
      let conceded = 0;
      if (minutes > 0) {
        if (hasLineups && onFrom.has(id)) {
          const from = onFrom.get(id)!;
          const until = offAt.get(id) ?? Infinity;
          conceded = goals.filter((goal) => goal.teamId !== team.team.id && goal.minute >= from && goal.minute < until).length;
        } else {
          // Uten oppstillinger antar vi at spilleren var på banen hele kampen.
          conceded = teamGoalsAgainst;
        }
      }
      const rating = stats.games.rating === null ? null : Number(stats.games.rating);
      lines.push({
        playerId: id,
        teamId: team.team.id,
        minutes,
        goals: stats.goals.total ?? 0,
        assists: stats.goals.assists ?? 0,
        saves: stats.goals.saves ?? 0,
        penaltiesSaved: stats.penalty.saved ?? 0,
        penaltiesMissed: stats.penalty.missed ?? 0,
        yellowCards: stats.cards.yellow ?? 0,
        redCards: stats.cards.red ?? 0,
        ownGoals: ownGoals.get(id) ?? 0,
        goalsConceded: conceded,
        defensiveActions: (stats.tackles?.total ?? 0) + (stats.tackles?.blocks ?? 0) + (stats.tackles?.interceptions ?? 0),
        rating: rating !== null && Number.isFinite(rating) ? rating : null,
      });
    }
  }
  return lines;
}
