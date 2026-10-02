import "server-only";
import { cache } from "react";
import { clubCrest } from "@/lib/club-crests";
import { playerPhoto } from "@/lib/player-photos";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { CompetitionCode } from "./competitions";
import { FANTASY_CUTOUT_IDS } from "./fantasy-cutouts";
import { FANTASY_KIT_FILES } from "./fantasy-kit-files";
import { kitSlug } from "./kits";
import { CANCELLED_STATUSES, FINISHED_STATUSES, LIVE_STATUSES } from "./fixture-lines";
import { CHIPS, type Chip, type PointsBreakdown } from "./points";
import type { FantasyPosition, Lineup } from "./squad-rules";

type Db = ReturnType<typeof supabaseAdmin>;

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data as NonNullable<T>;
}

async function loadAll<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = check(await query(offset, offset + 999));
    rows.push(...(page as T[]));
    if (page.length < 1000) return rows;
  }
}

export type FantasyRound = { number: number; startsAt: string; endsAt: string; deadlineAt: string; locked: boolean; finished: boolean };

// now er den simulerte klokka i testsesongen (simulated), ellers ekte tid.
export type FantasySeason = { apiSeason: number; label: string; now: string; simulated: boolean; rounds: FantasyRound[] };

export const getCurrentFantasySeason = cache(async (): Promise<FantasySeason | null> => {
  const db = supabaseAdmin();
  const season = check(await db.from("fantasy_seasons").select("api_season, label, simulated_now").eq("is_current", true).maybeSingle());
  if (!season) return null;
  const rounds = check(await db.from("fantasy_rounds").select("number, starts_at, ends_at, deadline_at, locked_at, finished_at").eq("api_season", season.api_season).order("number"));
  return {
    apiSeason: season.api_season,
    label: season.label,
    now: season.simulated_now ?? new Date().toISOString(),
    simulated: season.simulated_now !== null,
    rounds: rounds.map((round) => ({ number: round.number, startsAt: round.starts_at, endsAt: round.ends_at, deadlineAt: round.deadline_at, locked: round.locked_at !== null, finished: round.finished_at !== null })),
  };
});

// Neste runde man kan endre laget for, og runden som pågår (låst, ikke ferdig) eller sist ble spilt.
export function nextRound(season: FantasySeason) {
  return season.rounds.find((round) => !round.locked) ?? null;
}
export function currentRound(season: FantasySeason) {
  return [...season.rounds].reverse().find((round) => round.locked) ?? null;
}
// Halvdelen av sesongen en runde hører til (chips kan brukes én gang i hver).
export function seasonHalf(season: FantasySeason, round: number) {
  return round <= Math.ceil(season.rounds.length / 2) ? 1 : 2;
}

// En spiller man kan velge i lagbyggeren.
export type FantasyPlayerOption = {
  id: number;
  name: string;
  position: FantasyPosition;
  price: number;
  priceChange: number;
  points: number;
  clubId: number;
  clubName: string;
  competition: CompetitionCode;
  crest: string | null;
  kit: string | null;
  // Snittpoeng per kamp de siste 30 dagene, som «Form» i FPL.
  form: number;
  // Plassering blant spillerne på samme posisjon (1 er best/dyrest), og hvor mange de er.
  ranks: { price: number; form: number; points: number; of: number };
} & FantasyPhoto;

// Et utklipp uten bakgrunn når vi har et: hentet til fantasy med scripts/fantasy-cutouts.ts (som
// også bytter til nyere bilder med --refresh), ellers fra managerkarrieren. Uten utklipp brukes
// ansiktsbildet fra API-Football (hvit bakgrunn).
export type FantasyPhoto = { photo: string | null; photoCutout: boolean };

// Drakten som vises på banen (som i FPL): keeperdrakten for keepere når den finnes, ellers
// hjemmedrakten. Klubber uten drakt i public/fantasy-kits får null, og kortet viser bildet.
function clubKit(clubName: string, position: FantasyPosition) {
  const slug = kitSlug(clubName);
  const file = [position === "GK" ? `${slug}-gk.png` : null, `${slug}-home.png`].find((name) => name && FANTASY_KIT_FILES.has(name));
  return file ? `/fantasy-kits/${file}` : null;
}

function fantasyPhoto(apiPlayerId: number, slug: string | undefined, apiPhoto: string | null): FantasyPhoto {
  const cutout = (FANTASY_CUTOUT_IDS.has(apiPlayerId) ? `/fantasy-players/${apiPlayerId}.png` : null) ?? (slug ? playerPhoto(slug) : null);
  return cutout ? { photo: cutout, photoCutout: true } : { photo: apiPhoto, photoCutout: false };
}

type SeasonPlayerRow = {
  api_player_id: number;
  api_team_id: number;
  position: FantasyPosition;
  price: number;
  price_change: number;
  football_players: { name: string; photo_url: string | null; player_catalog: { name: string; slug: string } | null };
  football_season_teams: { club_id: number; competition_code: CompetitionCode; football_clubs: { name: string } };
};

const FORM_DAYS = 30;

// Poeng hver spiller har tatt i sesongen så langt, og formen: snittpoeng per kamp laget hans
// har spilt de siste 30 dagene (som i FPL). Kamper han ikke spilte i teller som 0.
async function seasonPoints(db: Db, season: number, now: string) {
  const since = new Date(new Date(now).getTime() - FORM_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [rows, recent] = await Promise.all([
    loadAll<{ api_fixture_id: number; api_player_id: number; points: number }>((from, to) =>
      db.from("football_fixture_players").select("api_fixture_id, api_player_id, points, football_fixtures!inner (api_season)").eq("football_fixtures.api_season", season).order("api_fixture_id").order("api_player_id").range(from, to)),
    // Ferdige kamper med poeng (details_synced_at) som startet før «nå» (testklokka i testsesongen).
    loadAll<{ api_fixture_id: number; home_team_id: number; away_team_id: number }>((from, to) =>
      db.from("football_fixtures").select("api_fixture_id, home_team_id, away_team_id").eq("api_season", season).in("status", FINISHED_STATUSES).not("details_synced_at", "is", null).gte("kickoff_at", since).lte("kickoff_at", now).order("api_fixture_id").range(from, to)),
  ]);
  const totals = new Map<number, number>();
  const recentIds = new Set(recent.map((fixture) => fixture.api_fixture_id));
  const recentPoints = new Map<number, number>();
  for (const row of rows) {
    totals.set(row.api_player_id, (totals.get(row.api_player_id) ?? 0) + row.points);
    if (recentIds.has(row.api_fixture_id)) recentPoints.set(row.api_player_id, (recentPoints.get(row.api_player_id) ?? 0) + row.points);
  }
  const teamMatches = new Map<number, number>();
  for (const fixture of recent) for (const team of [fixture.home_team_id, fixture.away_team_id]) teamMatches.set(team, (teamMatches.get(team) ?? 0) + 1);
  const form = (playerId: number, teamId: number) => {
    const matches = teamMatches.get(teamId) ?? 0;
    return matches ? Math.round(((recentPoints.get(playerId) ?? 0) / matches) * 10) / 10 : 0;
  };
  return { totals, form };
}

// Plassering etter value (høyest først) innen hver posisjon. Like verdier gir lik plassering.
function rankWithinPosition(players: { id: number; position: FantasyPosition }[], value: (id: number) => number) {
  const ranks = new Map<number, number>();
  for (const position of new Set(players.map((player) => player.position))) {
    const sorted = players.filter((player) => player.position === position).sort((a, b) => value(b.id) - value(a.id));
    sorted.forEach((player, index) => ranks.set(player.id, index > 0 && value(sorted[index - 1].id) === value(player.id) ? ranks.get(sorted[index - 1].id)! : index + 1));
  }
  return ranks;
}

// Alle spillerne i sesongen, de dyreste først. now er «nå» for formen (testklokka i testsesongen).
export const listFantasyPlayers = cache(async (season: number, now: string): Promise<FantasyPlayerOption[]> => {
  const db = supabaseAdmin();
  const [rows, { totals: points, form }] = await Promise.all([
    loadAll<SeasonPlayerRow>((from, to) => db
      .from("football_season_players")
      .select("api_player_id, api_team_id, position, price, price_change, football_players (name, photo_url, player_catalog (name, slug)), football_season_teams (club_id, competition_code, football_clubs (name))")
      .eq("api_season", season)
      .order("price", { ascending: false })
      .order("api_player_id")
      .range(from, to)),
    seasonPoints(db, season, now),
  ]);
  const forms = new Map(rows.map((row) => [row.api_player_id, form(row.api_player_id, row.api_team_id)]));
  const prices = new Map(rows.map((row) => [row.api_player_id, row.price]));
  const ranked = rows.map((row) => ({ id: row.api_player_id, position: row.position }));
  const priceRanks = rankWithinPosition(ranked, (id) => prices.get(id)!);
  const formRanks = rankWithinPosition(ranked, (id) => forms.get(id)!);
  const pointsRanks = rankWithinPosition(ranked, (id) => points.get(id) ?? 0);
  const perPosition = new Map<FantasyPosition, number>();
  for (const row of rows) perPosition.set(row.position, (perPosition.get(row.position) ?? 0) + 1);
  return rows.map((row) => {
    // Navnet fra katalogen er det kjente navnet («Erling Haaland» i stedet for «E. Haaland»).
    const catalog = row.football_players.player_catalog;
    const clubName = row.football_season_teams.football_clubs.name;
    return {
      id: row.api_player_id,
      name: catalog?.name ?? row.football_players.name,
      position: row.position,
      price: row.price,
      priceChange: row.price_change,
      points: points.get(row.api_player_id) ?? 0,
      clubId: row.football_season_teams.club_id,
      clubName,
      competition: row.football_season_teams.competition_code,
      crest: clubCrest(clubName),
      kit: clubKit(clubName, row.position),
      form: forms.get(row.api_player_id)!,
      ranks: { price: priceRanks.get(row.api_player_id)!, form: formRanks.get(row.api_player_id)!, points: pointsRanks.get(row.api_player_id)!, of: perPosition.get(row.position)! },
      ...fantasyPhoto(row.api_player_id, catalog?.slug, row.football_players.photo_url),
    };
  });
});

// Om en kamp er kommende, pågår eller er ferdig sett fra season.now (testklokka i testsesongen).
// En kamp regnes som ferdig først 115 minutter etter avspark, som i den automatiske jobben.
function fixtureState(status: string, kickoffAt: string, now: number): FixtureView["state"] {
  const kickoff = new Date(kickoffAt).getTime();
  if (CANCELLED_STATUSES.includes(status)) return "cancelled";
  if (kickoff > now) return "upcoming";
  if (FINISHED_STATUSES.includes(status) && kickoff + 115 * 60_000 <= now) return "finished";
  return LIVE_STATUSES.includes(status) || FINISHED_STATUSES.includes(status) ? "live" : "upcoming";
}

// En kommende kamp i spillervinduet (fanen «Kamper»).
export type PlayerFixture = { id: number; round: number | null; kickoffAt: string; opponent: string; opponentCrest: string | null; home: boolean; live: boolean };

// En spilt kamp i spillervinduet (fanen «Resultater»), med tallene som i FPL. price er prisen
// ved rundens frist, eller null for runder fra før prisene ble lagret.
export type PlayerResult = {
  id: number;
  round: number | null;
  opponent: string;
  opponentCrest: string | null;
  home: boolean;
  goalsFor: number | null;
  goalsAgainst: number | null;
  points: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: number;
  goalsConceded: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  bonus: number;
  price: number | null;
};

export type PlayerPreviousSeason = { label: string; appearances: number; minutes: number; goals: number; assists: number };

export type FantasyPlayerDetails = { fixtures: PlayerFixture[]; results: PlayerResult[]; previousSeason: PlayerPreviousSeason | null };

type FixtureLineRow = {
  api_fixture_id: number;
  api_team_id: number;
  points: number;
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  own_goals: number;
  goals_conceded: number;
  bonus: number;
};

type PlayerFixtureRow = { api_fixture_id: number; kickoff_at: string; status: string; round_number: number | null; home_team_id: number; away_team_id: number; home_goals: number | null; away_goals: number | null };
const PLAYER_FIXTURE_COLUMNS = "api_fixture_id, kickoff_at, status, round_number, home_team_id, away_team_id, home_goals, away_goals";

// Kampene til en spiller i sesongen: kommende kamper for laget han er i nå, og alle spilte kamper
// for laget hans (også de han ikke var med i, med 0 minutter) og kamper han spilte for et annet lag.
export async function getFantasyPlayerDetails(season: FantasySeason, playerId: number): Promise<FantasyPlayerDetails | null> {
  const db = supabaseAdmin();
  const player = check(await db.from("football_season_players").select("api_team_id").eq("api_season", season.apiSeason).eq("api_player_id", playerId).maybeSingle());
  if (!player) return null;
  const teamId: number = player.api_team_id;
  const [teamFixtures, lines, teams, prices, previous, previousSeason] = await Promise.all([
    check(await db.from("football_fixtures").select(PLAYER_FIXTURE_COLUMNS).eq("api_season", season.apiSeason).or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).order("kickoff_at")) as PlayerFixtureRow[],
    check(await db.from("football_fixture_players").select("api_fixture_id, api_team_id, points, minutes, goals, assists, saves, penalties_saved, penalties_missed, yellow_cards, red_cards, own_goals, goals_conceded, bonus, football_fixtures!inner (api_season)").eq("api_player_id", playerId).eq("football_fixtures.api_season", season.apiSeason)) as unknown as FixtureLineRow[],
    check(await db.from("football_season_teams").select("api_team_id, football_clubs (name)").eq("api_season", season.apiSeason)) as unknown as { api_team_id: number; football_clubs: { name: string } }[],
    // Tabellen kommer med migrering 0050. Finnes den ikke ennå, vises prisen som «–».
    db.from("fantasy_player_round_prices").select("round_number, price").eq("api_season", season.apiSeason).eq("api_player_id", playerId),
    check(await db.from("football_player_season_stats").select("appearances, minutes, goals, assists").eq("api_season", season.apiSeason - 1).eq("api_player_id", playerId)),
    check(await db.from("fantasy_seasons").select("label").eq("api_season", season.apiSeason - 1).maybeSingle()),
  ]);
  const names = new Map(teams.map((team) => [team.api_team_id, team.football_clubs.name]));
  const priceByRound = new Map((prices.data ?? []).map((row) => [row.round_number, row.price]));
  const lineByFixture = new Map(lines.map((line) => [line.api_fixture_id, line]));
  // Kamper han spilte for et annet lag tidligere i sesongen.
  const otherIds = lines.map((line) => line.api_fixture_id).filter((id) => !teamFixtures.some((fixture) => fixture.api_fixture_id === id));
  const otherFixtures = otherIds.length ? check(await db.from("football_fixtures").select(PLAYER_FIXTURE_COLUMNS).in("api_fixture_id", otherIds)) as PlayerFixtureRow[] : [];
  const now = new Date(season.now).getTime();
  const all = [...teamFixtures, ...otherFixtures].sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));

  const fixtures: PlayerFixture[] = [];
  const results: PlayerResult[] = [];
  for (const fixture of all) {
    const state = fixtureState(fixture.status, fixture.kickoff_at, now);
    const line = lineByFixture.get(fixture.api_fixture_id);
    const side = line?.api_team_id ?? teamId;
    const home = fixture.home_team_id === side;
    const opponent = names.get(home ? fixture.away_team_id : fixture.home_team_id) ?? "?";
    const base = { id: fixture.api_fixture_id, round: fixture.round_number, opponent, opponentCrest: clubCrest(opponent), home };
    if (state === "upcoming" || state === "live") {
      if (side === teamId) fixtures.push({ ...base, kickoffAt: fixture.kickoff_at, live: state === "live" });
      continue;
    }
    if (state !== "finished") continue;
    results.push({
      ...base,
      goalsFor: home ? fixture.home_goals : fixture.away_goals,
      goalsAgainst: home ? fixture.away_goals : fixture.home_goals,
      points: line?.points ?? 0,
      minutes: line?.minutes ?? 0,
      goals: line?.goals ?? 0,
      assists: line?.assists ?? 0,
      // Som i poengreglene: minst 60 minutter uten baklengsmål mens han var på banen.
      cleanSheet: line && line.minutes >= 60 && line.goals_conceded === 0 ? 1 : 0,
      goalsConceded: line?.goals_conceded ?? 0,
      ownGoals: line?.own_goals ?? 0,
      penaltiesSaved: line?.penalties_saved ?? 0,
      penaltiesMissed: line?.penalties_missed ?? 0,
      yellowCards: line?.yellow_cards ?? 0,
      redCards: line?.red_cards ?? 0,
      saves: line?.saves ?? 0,
      bonus: line?.bonus ?? 0,
      price: fixture.round_number === null ? null : priceByRound.get(fixture.round_number) ?? null,
    });
  }
  const sum = (key: "appearances" | "minutes" | "goals" | "assists") => previous.reduce((total, row) => total + row[key], 0);
  const previousLabel = (previousSeason as { label: string } | null)?.label ?? `${season.apiSeason - 1}/${String(season.apiSeason % 100).padStart(2, "0")}`;
  return {
    fixtures,
    // Nyeste kamp først, som i FPL.
    results: results.reverse(),
    previousSeason: previous.length ? { label: previousLabel, appearances: sum("appearances"), minutes: sum("minutes"), goals: sum("goals"), assists: sum("assists") } : null,
  };
}

// Kampene hver klubb (club_id) har i en runde, som på kortene vises som «ARS (H)».
export type ClubFixture = { opponent: string; opponentCrest: string | null; home: boolean; kickoffAt: string };

export async function roundFixturesByClub(season: number, round: number): Promise<Record<number, ClubFixture[]>> {
  const db = supabaseAdmin();
  const [fixtures, teams] = await Promise.all([
    check(await db.from("football_fixtures").select("home_team_id, away_team_id, kickoff_at, status").eq("api_season", season).eq("round_number", round).order("kickoff_at")),
    check(await db.from("football_season_teams").select("api_team_id, club_id, football_clubs (name)").eq("api_season", season)) as unknown as { api_team_id: number; club_id: number; football_clubs: { name: string } }[],
  ]);
  const byTeam = new Map(teams.map((team) => [team.api_team_id, team]));
  const result: Record<number, ClubFixture[]> = {};
  for (const fixture of fixtures) {
    if (CANCELLED_STATUSES.includes(fixture.status)) continue;
    const home = byTeam.get(fixture.home_team_id);
    const away = byTeam.get(fixture.away_team_id);
    if (!home || !away) continue;
    (result[home.club_id] ??= []).push({ opponent: away.football_clubs.name, opponentCrest: clubCrest(away.football_clubs.name), home: true, kickoffAt: fixture.kickoff_at });
    (result[away.club_id] ??= []).push({ opponent: home.football_clubs.name, opponentCrest: clubCrest(home.football_clubs.name), home: false, kickoffAt: fixture.kickoff_at });
  }
  return result;
}

export type ChipState = { chip: Chip; state: "available" | "used" | "active" | "tooEarly" };

// Laget man har nå (for neste runde), med alt lagbyggeren trenger for bytter og chips.
export type FantasyTeam = Lineup & {
  id: string;
  name: string;
  bank: number;
  // Hva hver spiller ble kjøpt for (for salgsprisen).
  purchasePrices: Record<number, number>;
  freeTransfers: number;
  // Laget slik det var låst i forrige runde. Tomt før laget har vært med i en runde.
  lockedSquad: number[];
  pendingChip: Chip | null;
  freeHitActive: boolean;
  chips: ChipState[];
};

export async function getFantasyTeam(userId: string, season: FantasySeason): Promise<FantasyTeam | null> {
  const db = supabaseAdmin();
  const team = check(await db
    .from("fantasy_teams")
    .select("id, name, captain_id, vice_captain_id, bank, free_transfers, pending_chip, first_round, free_hit_backup")
    .eq("user_id", userId)
    .eq("api_season", season.apiSeason)
    .maybeSingle());
  if (!team) return null;
  const [picks, rounds] = await Promise.all([
    check(await db.from("fantasy_team_players").select("api_player_id, slot, purchase_price").eq("team_id", team.id).order("slot")),
    check(await db.from("fantasy_team_rounds").select("round_number, chip").eq("team_id", team.id).order("round_number")),
  ]);
  const lastRound = rounds.at(-1)?.round_number ?? null;
  const lockedSquad = lastRound === null ? [] : check(await db.from("fantasy_team_round_players").select("api_player_id").eq("team_id", team.id).eq("round_number", lastRound)).map((row) => row.api_player_id);
  const upcoming = nextRound(season);
  const half = upcoming ? seasonHalf(season, upcoming.number) : 2;
  const chips: ChipState[] = CHIPS.map((chip) => {
    if (team.pending_chip === chip) return { chip, state: "active" };
    if (rounds.some((round) => round.chip === chip && seasonHalf(season, round.round_number) === half)) return { chip, state: "used" };
    if ((chip === "wildcard" || chip === "free_hit") && team.first_round === null) return { chip, state: "tooEarly" };
    return { chip, state: "available" };
  });
  return {
    id: team.id,
    name: team.name,
    starters: picks.filter((pick) => pick.slot <= 11).map((pick) => pick.api_player_id),
    bench: picks.filter((pick) => pick.slot > 11).map((pick) => pick.api_player_id),
    captainId: team.captain_id,
    viceCaptainId: team.vice_captain_id,
    bank: team.bank,
    purchasePrices: Object.fromEntries(picks.map((pick) => [pick.api_player_id, pick.purchase_price])),
    freeTransfers: team.free_transfers,
    lockedSquad,
    pendingChip: team.pending_chip,
    freeHitActive: team.free_hit_backup !== null,
    chips,
  };
}

export type RoundPick = {
  playerId: number;
  name: string;
  position: FantasyPosition;
  clubName: string;
  crest: string | null;
  kit: string | null;
  slot: number;
  points: number;
  multiplier: number;
  subbedIn: boolean;
  subbedOut: boolean;
  breakdown: PointsBreakdown | null;
} & FantasyPhoto;

export type TeamRoundView = {
  teamId: string;
  teamName: string;
  username: string;
  round: number;
  points: number;
  benchPoints: number;
  transfers: number;
  transferCost: number;
  chip: Chip | null;
  captainId: number;
  viceCaptainId: number;
  effectiveCaptainId: number | null;
  picks: RoundPick[];
  totalPoints: number;
};

// Et lag i en låst runde: hvem som spilte, poengene og hvordan de ble til.
export async function getTeamRound(teamId: string, round: number, season: number): Promise<TeamRoundView | null> {
  const db = supabaseAdmin();
  const teamRound = check(await db
    .from("fantasy_team_rounds")
    .select("team_id, round_number, points, bench_points, transfers, transfer_cost, chip, captain_id, vice_captain_id, effective_captain_id, fantasy_teams!inner (name, api_season, profiles (username))")
    .eq("team_id", teamId)
    .eq("round_number", round)
    .eq("fantasy_teams.api_season", season)
    .maybeSingle()) as unknown as { points: number; bench_points: number; transfers: number; transfer_cost: number; chip: Chip | null; captain_id: number; vice_captain_id: number; effective_captain_id: number | null; fantasy_teams: { name: string; profiles: { username: string } } } | null;
  if (!teamRound) return null;
  const [picks, fixtures, totals] = await Promise.all([
    check(await db.from("fantasy_team_round_players").select("api_player_id, slot, points, multiplier, subbed_in, subbed_out").eq("team_id", teamId).eq("round_number", round).order("slot")),
    check(await db.from("football_fixtures").select("api_fixture_id").eq("api_season", season).eq("round_number", round)),
    check(await db.from("fantasy_team_rounds").select("points").eq("team_id", teamId).lte("round_number", round)),
  ]);
  const ids = picks.map((pick) => pick.api_player_id);
  const [players, lines] = await Promise.all([
    check(await db.from("football_season_players").select("api_player_id, position, football_players (name, photo_url, player_catalog (name, slug)), football_season_teams (football_clubs (name))").eq("api_season", season).in("api_player_id", ids)) as unknown as { api_player_id: number; position: FantasyPosition; football_players: { name: string; photo_url: string | null; player_catalog: { name: string; slug: string } | null }; football_season_teams: { football_clubs: { name: string } } }[],
    fixtures.length ? check(await db.from("football_fixture_players").select("api_player_id, breakdown").in("api_fixture_id", fixtures.map((fixture) => fixture.api_fixture_id)).in("api_player_id", ids)) : [],
  ]);
  const byId = new Map(players.map((player) => [player.api_player_id, player]));
  // En spiller kan ha to kamper i runden: da legges delene sammen.
  const breakdowns = new Map<number, PointsBreakdown>();
  for (const line of lines as { api_player_id: number; breakdown: PointsBreakdown }[]) {
    const current = breakdowns.get(line.api_player_id);
    if (!current) breakdowns.set(line.api_player_id, { ...line.breakdown });
    else for (const key of Object.keys(line.breakdown) as (keyof PointsBreakdown)[]) current[key] += line.breakdown[key];
  }
  return {
    teamId,
    teamName: teamRound.fantasy_teams.name,
    username: teamRound.fantasy_teams.profiles.username,
    round,
    points: teamRound.points,
    benchPoints: teamRound.bench_points,
    transfers: teamRound.transfers,
    transferCost: teamRound.transfer_cost,
    chip: teamRound.chip,
    captainId: teamRound.captain_id,
    viceCaptainId: teamRound.vice_captain_id,
    effectiveCaptainId: teamRound.effective_captain_id,
    totalPoints: totals.reduce((sum, row) => sum + row.points, 0),
    picks: picks.map((pick) => {
      const player = byId.get(pick.api_player_id);
      const clubName = player?.football_season_teams.football_clubs.name ?? "";
      return {
        playerId: pick.api_player_id,
        name: player?.football_players.player_catalog?.name ?? player?.football_players.name ?? "?",
        position: player?.position ?? "MID",
        clubName,
        crest: clubCrest(clubName),
        kit: clubKit(clubName, player?.position ?? "MID"),
        slot: pick.slot,
        points: pick.points,
        multiplier: pick.multiplier,
        subbedIn: pick.subbed_in,
        subbedOut: pick.subbed_out,
        breakdown: breakdowns.get(pick.api_player_id) ?? null,
        ...fantasyPhoto(pick.api_player_id, player?.football_players.player_catalog?.slug, player?.football_players.photo_url ?? null),
      };
    }),
  };
}

export type FixtureView = {
  id: number;
  competition: CompetitionCode;
  kickoffAt: string;
  state: "upcoming" | "live" | "finished" | "cancelled";
  home: { name: string; crest: string | null; goals: number | null };
  away: { name: string; crest: string | null; goals: number | null };
};

export async function listRoundFixtures(season: FantasySeason, round: number): Promise<FixtureView[]> {
  const db = supabaseAdmin();
  const fixtures = check(await db.from("football_fixtures").select("api_fixture_id, competition_code, kickoff_at, status, home_team_id, away_team_id, home_goals, away_goals").eq("api_season", season.apiSeason).eq("round_number", round).order("kickoff_at"));
  const teams = check(await db.from("football_season_teams").select("api_team_id, football_clubs (name)").eq("api_season", season.apiSeason)) as unknown as { api_team_id: number; football_clubs: { name: string } }[];
  const names = new Map(teams.map((team) => [team.api_team_id, team.football_clubs.name]));
  const now = new Date(season.now).getTime();
  return fixtures.map((fixture) => {
    const state = fixtureState(fixture.status, fixture.kickoff_at, now);
    const side = (teamId: number, goals: number | null) => ({ name: names.get(teamId) ?? "?", crest: clubCrest(names.get(teamId) ?? ""), goals: state === "upcoming" || state === "cancelled" ? null : goals });
    return { id: fixture.api_fixture_id, competition: fixture.competition_code, kickoffAt: fixture.kickoff_at, state, home: side(fixture.home_team_id, fixture.home_goals), away: side(fixture.away_team_id, fixture.away_goals) };
  });
}

export type StandingRow = { rank: number; teamId: string; teamName: string; username: string; userId: string; roundPoints: number; totalPoints: number };

// Tabell for en liga (eller alle lag når userIds er null). Teller runder fra og med startRound.
export async function standings(season: FantasySeason, userIds: string[] | null, startRound = 1): Promise<StandingRow[]> {
  const db = supabaseAdmin();
  let query = db.from("fantasy_teams").select("id, name, user_id, profiles (username)").eq("api_season", season.apiSeason);
  if (userIds) query = query.in("user_id", userIds);
  const teams = check(await query) as unknown as { id: string; name: string; user_id: string; profiles: { username: string } }[];
  if (!teams.length) return [];
  const rounds = await loadAll<{ team_id: string; round_number: number; points: number }>((from, to) =>
    db.from("fantasy_team_rounds").select("team_id, round_number, points").in("team_id", teams.map((team) => team.id)).gte("round_number", startRound).order("team_id").order("round_number").range(from, to));
  const latest = currentRound(season)?.number ?? 0;
  const rows = teams.map((team) => {
    const own = rounds.filter((round) => round.team_id === team.id);
    return {
      rank: 0,
      teamId: team.id,
      teamName: team.name,
      username: team.profiles.username,
      userId: team.user_id,
      roundPoints: own.find((round) => round.round_number === latest)?.points ?? 0,
      totalPoints: own.reduce((sum, round) => sum + round.points, 0),
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.roundPoints - a.roundPoints || a.teamName.localeCompare(b.teamName));
  // Like mange poeng gir lik plassering.
  rows.forEach((row, index) => { row.rank = index > 0 && rows[index - 1].totalPoints === row.totalPoints ? rows[index - 1].rank : index + 1; });
  return rows;
}

export type FantasyLeague = { id: string; name: string; ownerId: string; inviteCode: string; startRound: number; memberCount: number };

export async function listMyLeagues(userId: string, season: number): Promise<FantasyLeague[]> {
  const db = supabaseAdmin();
  const memberships = check(await db.from("fantasy_league_members").select("league_id").eq("user_id", userId));
  if (!memberships.length) return [];
  const leagues = check(await db.from("fantasy_leagues").select("id, name, owner_id, invite_code, start_round, fantasy_league_members (count)").eq("api_season", season).in("id", memberships.map((row) => row.league_id)).order("created_at")) as unknown as { id: string; name: string; owner_id: string; invite_code: string; start_round: number; fantasy_league_members: { count: number }[] }[];
  return leagues.map((league) => ({ id: league.id, name: league.name, ownerId: league.owner_id, inviteCode: league.invite_code, startRound: league.start_round, memberCount: league.fantasy_league_members[0]?.count ?? 0 }));
}

export async function getLeague(leagueId: string): Promise<(FantasyLeague & { memberIds: string[] }) | null> {
  const db = supabaseAdmin();
  const league = check(await db.from("fantasy_leagues").select("id, name, owner_id, invite_code, start_round").eq("id", leagueId).maybeSingle());
  if (!league) return null;
  const members = check(await db.from("fantasy_league_members").select("user_id").eq("league_id", leagueId));
  return { id: league.id, name: league.name, ownerId: league.owner_id, inviteCode: league.invite_code, startRound: league.start_round, memberCount: members.length, memberIds: members.map((member) => member.user_id) };
}

export async function getLeagueByCode(code: string) {
  const league = check(await supabaseAdmin().from("fantasy_leagues").select("id, name").eq("invite_code", code.toUpperCase()).maybeSingle());
  return league ?? null;
}
