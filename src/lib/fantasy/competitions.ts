// De fem ligaene i fantasy. Samme koder og API-Football-id-er som
// football_competitions i 0046_fantasy_football_data.sql.
export const FANTASY_COMPETITIONS = [
  { code: "premier_league", name: "Premier League", country: "GB", apiLeagueId: 39 },
  { code: "la_liga", name: "La Liga", country: "ES", apiLeagueId: 140 },
  { code: "serie_a", name: "Serie A", country: "IT", apiLeagueId: 135 },
  { code: "bundesliga", name: "Bundesliga", country: "DE", apiLeagueId: 78 },
  { code: "ligue_1", name: "Ligue 1", country: "FR", apiLeagueId: 61 },
] as const;

export type CompetitionCode = (typeof FANTASY_COMPETITIONS)[number]["code"];

export function isCompetitionCode(value: string): value is CompetitionCode {
  return FANTASY_COMPETITIONS.some((competition) => competition.code === value);
}
