// Fantasy-priser, som i Premier League Fantasy: prisen følger hvor mange poeng spilleren
// har tatt (forrige sesong) og tar nå (denne sesongen), med litt «rykte» fra ratingen i
// spillerkatalogen. Prisen er i tideler av en million (45 = 4,5 mill.).
// Lagres i football_season_players.price av `npm run fantasy:sync`. Ingen importer, så
// fila kan brukes av skriptene i scripts/ også.

type Position = "GK" | "DEF" | "MID" | "FWD";

// Sesongsummer i ligaen for én spiller (football_player_season_stats).
export type SeasonStats = {
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  goalsConceded: number;
  saves: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  rating: number | null;
};

// Laget spilleren spilte for: ferdigspilte ligakamper, kamper uten baklengsmål og baklengsmål.
export type TeamDefence = { matches: number; cleanSheets: number; conceded: number };

// Poeng som i Premier League Fantasy.
const GOAL_POINTS: Record<Position, number> = { GK: 6, DEF: 6, MID: 5, FWD: 4 };
const CLEAN_SHEET_POINTS: Record<Position, number> = { GK: 4, DEF: 4, MID: 1, FWD: 0 };
const ASSIST_POINTS = 3;

// Omtrent hvor mange fantasy-poeng spilleren tok i sesongen. Vi har bare sesongsummer,
// så clean sheets og baklengsmål fordeles etter hvor stor del av lagets minutter han spilte,
// og bonuspoengene anslås ut fra snittkarakteren.
export function estimatedPoints(position: Position, stats: SeasonStats, team: TeamDefence) {
  if (stats.appearances === 0 || team.matches === 0) return 0;
  const share = Math.min(1, stats.minutes / (team.matches * 90));
  const averageMinutes = stats.minutes / stats.appearances;
  let points = stats.appearances * (averageMinutes >= 60 ? 2 : 1);
  points += stats.goals * GOAL_POINTS[position] + stats.assists * ASSIST_POINTS;
  points += team.cleanSheets * share * CLEAN_SHEET_POINTS[position];
  if (position === "GK" || position === "DEF") points -= (team.conceded * share) / 2;
  if (position === "GK") points += stats.saves / 3 + stats.penaltiesSaved * 5;
  points -= stats.penaltiesMissed * 2 + stats.yellowCards + stats.redCards * 3;
  // Snittkarakter 7,7 gir rundt ett bonuspoeng per kamp, 6,7 eller lavere gir ingen.
  if (stats.rating !== null) points += stats.appearances * Math.min(2, Math.max(0, stats.rating - 6.7));
  return points;
}

export type SeasonInput = { stats: SeasonStats; team: TeamDefence };

// Et vanlig nivå (poeng over en sesong) for en spiller vi bare har noen få kamper for, og hvor
// mange minutter (to sesonger til sammen) som skal til før vi stoler helt på hans egne tall.
// Nivået er lavt, fordi spillere med få minutter som regel er innbyttere.
const PRIOR_POINTS: Record<Position, number> = { GK: 50, DEF: 50, MID: 55, FWD: 55 };
const TRUSTED_MINUTES = 20 * 90;

// Ferdigspilte kamper i en sesong → kamper, clean sheets og baklengsmål per lag.
export function teamDefences(fixtures: readonly { home_team_id: number; away_team_id: number; home_goals: number | null; away_goals: number | null }[]) {
  const defence = new Map<number, TeamDefence>();
  const addMatch = (teamId: number, conceded: number) => {
    const team = defence.get(teamId) ?? { matches: 0, cleanSheets: 0, conceded: 0 };
    team.matches += 1;
    team.conceded += conceded;
    if (conceded === 0) team.cleanSheets += 1;
    defence.set(teamId, team);
  };
  for (const fixture of fixtures) {
    if (fixture.home_goals === null || fixture.away_goals === null) continue;
    addMatch(fixture.home_team_id, fixture.away_goals);
    addMatch(fixture.away_team_id, fixture.home_goals);
  }
  return defence;
}

// Sesongtall for én spiller i ett lag (som football_player_season_stats).
export type StatsRow = {
  api_player_id: number;
  api_team_id: number;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  goals_conceded: number;
  saves: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  rating: number | string | null;
};

// Statistikken for hver spiller i en sesong, sammen med laget han spilte mest for. Har han
// spilt for flere lag, legges tallene sammen og snittkarakteren vektes etter kamper.
// API-Football lister noen ganger en spiller med samme sesongtall på både det gamle og det
// nye laget når han bytter klubb etter sesongen. Like rader telles bare én gang.
export function seasonInputsFromRows(rows: readonly StatsRow[], defence: ReadonlyMap<number, TeamDefence>) {
  const byPlayer = new Map<number, StatsRow[]>();
  for (const row of rows) byPlayer.set(row.api_player_id, [...(byPlayer.get(row.api_player_id) ?? []), row]);
  const sameNumbers = (a: StatsRow, b: StatsRow) => a.appearances === b.appearances && a.goals === b.goals && a.assists === b.assists && a.yellow_cards === b.yellow_cards;
  const inputs = new Map<number, SeasonInput>();
  for (const [playerId, allRows] of byPlayer) {
    const playerRows = [...allRows].sort((a, b) => b.minutes - a.minutes).filter((row, index, sorted) => !sorted.slice(0, index).some((earlier) => sameNumbers(earlier, row)));
    const sum = (key: keyof StatsRow) => playerRows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
    const rated = playerRows.filter((row) => row.rating !== null && row.appearances > 0);
    const ratedApps = rated.reduce((total, row) => total + row.appearances, 0);
    const stats: SeasonStats = {
      appearances: sum("appearances"),
      minutes: sum("minutes"),
      goals: sum("goals"),
      assists: sum("assists"),
      goalsConceded: sum("goals_conceded"),
      saves: sum("saves"),
      penaltiesSaved: sum("penalties_saved"),
      penaltiesMissed: sum("penalties_missed"),
      yellowCards: sum("yellow_cards"),
      redCards: sum("red_cards"),
      rating: ratedApps ? rated.reduce((total, row) => total + Number(row.rating) * row.appearances, 0) / ratedApps : null,
    };
    // Clean sheets og baklengsmål hentes fra laget han spilte flest minutter for.
    const team = defence.get(playerRows[0].api_team_id);
    if (team) inputs.set(playerId, { stats, team });
  }
  return inputs;
}

// Forventede poeng over en hel sesong på 38 kamper. Tidlig i sesongen teller forrige sesong
// mest; jo mer spilleren har spilt denne sesongen, jo mer teller den (opptil 75 %).
// Null betyr at vi ikke har statistikk for spilleren i noen av sesongene.
export function expectedPoints(position: Position, current: SeasonInput | null, previous: SeasonInput | null) {
  const perSeason = (input: SeasonInput) => (estimatedPoints(position, input.stats, input.team) / input.team.matches) * 38;
  const now = current && current.team.matches > 0 ? perSeason(current) : null;
  const before = previous && previous.team.matches > 0 ? perSeason(previous) : null;
  if (now === null && before === null) return null;
  const blended = now === null ? before! : before === null ? now : (() => {
    const weight = Math.min(0.75, current!.stats.minutes / (25 * 90));
    return weight * now + (1 - weight) * before;
  })();
  // Noen få kamper er for lite å gå etter (f.eks. nyopprykket, ny i ligaene eller bare
  // kvalifiseringskamper). Under TRUSTED_MINUTES dras anslaget mot et vanlig nivå for posisjonen.
  const minutes = (now === null ? 0 : current!.stats.minutes) + (before === null ? 0 : previous!.stats.minutes);
  // Har ikke spilt et minutt: laveste pris.
  if (minutes === 0) return 0;
  const trust = Math.min(1, minutes / TRUSTED_MINUTES);
  return trust * blended + (1 - trust) * PRIOR_POINTS[position];
}

// Laveste og høyeste pris, og hvor mange poeng som gir høyeste pris, per posisjon.
const PRICE_RANGE: Record<Position, [number, number]> = { GK: [40, 60], DEF: [40, 75], MID: [45, 145], FWD: [45, 150] };
const TOP_POINTS: Record<Position, number> = { GK: 170, DEF: 190, MID: 260, FWD: 240 };
const RATING_RANGE = [60, 91] as const;
// Hvor mye ratingen i katalogen («ryktet») teller når vi har poeng å gå etter.
const REPUTATION_WEIGHT = 0.25;

const roundToHalf = (price: number) => Math.round(price / 5) * 5;

function pointsPrice(position: Position, points: number) {
  const [lowest, highest] = PRICE_RANGE[position];
  const share = Math.min(1, Math.max(0, points / TOP_POINTS[position]));
  // Brattere enn rett linje: de beste koster mye, middels spillere er rimelige.
  return lowest + (highest - lowest) * share ** 1.5;
}

function ratingPrice(position: Position, overall: number) {
  const [lowest, highest] = PRICE_RANGE[position];
  const share = Math.min(1, Math.max(0, (overall - RATING_RANGE[0]) / (RATING_RANGE[1] - RATING_RANGE[0])));
  return lowest + (highest - lowest) * share * share;
}

// Prisen i tideler, rundet til nærmeste halve million. Uten poeng brukes ratingen, og uten
// noen av delene får spilleren laveste pris.
export function fantasyPrice(position: Position, points: number | null, overall: number | null) {
  const [lowest] = PRICE_RANGE[position];
  if (points === null) return roundToHalf(overall === null ? lowest : ratingPrice(position, overall));
  const fromPoints = pointsPrice(position, points);
  if (overall === null) return roundToHalf(fromPoints);
  return roundToHalf((1 - REPUTATION_WEIGHT) * fromPoints + REPUTATION_WEIGHT * ratingPrice(position, overall));
}

// 45 blir «4,5» eller «4.5» avhengig av språket.
export function formatPrice(price: number, locale: string) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(price / 10);
}
