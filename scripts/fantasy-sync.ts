// Henter lag, terminliste og staller for fantasy fra API-Football og lagrer dem i
// Supabase. Kjøres med `npm run fantasy:sync`, eventuelt med valg:
//
//   --season 2024            sesongen (året den starter). Standard: sesongen som er satt som gjeldende.
//   --league premier_league  bare én liga. Standard: alle fem.
//   --max-requests 90        stopp før så mange forespørsler er brukt. Standard: 90.
//   --current                gjør sesongen til den som spilles nå (og slår av den simulerte klokka).
//
// Skriptet kan kjøres flere ganger. Lag som allerede er hentet hoppes over, og staller
// som ikke rakk å bli hentet (gratisplanen gir 100 forespørsler per døgn) hentes neste gang.
import { createClient } from "@supabase/supabase-js";
import { ApiFootballClient, fantasyPosition, type ApiPlayer } from "../src/lib/fantasy/api-football.ts";
import { FANTASY_COMPETITIONS } from "../src/lib/fantasy/competitions.ts";
import { expectedPoints, fantasyPrice, seasonInputsFromRows, teamDefences, type StatsRow } from "../src/lib/fantasy/pricing.ts";
import type { FantasyPosition } from "../src/lib/fantasy/squad-rules.ts";
import { API_TEAM_ALIASES, decodeApiText, matchCatalogPlayer, matchClubName, resolveDuplicateMatches, type CatalogCandidate } from "../src/lib/fantasy/matching.ts";

// Hver stall tar som regel 2–3 forespørsler (20 spillere per side).
const REQUESTS_PER_SQUAD = 3;

function option(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Mangler ${name} i .env.local`);
  return value;
}

// Uten feil har Supabase alltid data, så null fjernes fra typen.
function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data as NonNullable<T>;
}

const db = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const api = new ApiFootballClient(required("API_FOOTBALL_KEY"));
const maxRequests = Number(option("max-requests") ?? 90);
const leagueOption = option("league");
const competitions = FANTASY_COMPETITIONS.filter((competition) => !leagueOption || competition.code === leagueOption);
if (!competitions.length) throw new Error(`Ukjent liga: ${leagueOption}`);

const seasonOption = option("season");
const season = seasonOption
  ? Number(seasonOption)
  : check(await db.from("fantasy_seasons").select("api_season").eq("is_current", true).single()).api_season as number;

// Sesongen opprettes hvis den ikke finnes. --current gjør den til sesongen som spilles nå.
check(await db.from("fantasy_seasons").upsert({ api_season: season, label: `${season}/${String(season + 1).slice(2)}` }, { onConflict: "api_season", ignoreDuplicates: true }));
if (process.argv.includes("--current")) {
  check(await db.from("fantasy_seasons").update({ is_current: false }).neq("api_season", season));
  check(await db.from("fantasy_seasons").update({ is_current: true, simulated_now: null }).eq("api_season", season));
  console.log(`Sesong ${season} er nå gjeldende`);
}

function budgetLeft(needed: number) {
  const usedHere = api.requestsMade + needed <= maxRequests;
  const leftToday = api.remainingToday === null || api.remainingToday >= needed;
  return usedHere && leftToday;
}

// 1) Lagene i hver liga. Hentes bare hvis ligaen ikke har lag for sesongen ennå.
async function syncTeams(competition: (typeof FANTASY_COMPETITIONS)[number]) {
  const existing = check(await db.from("football_season_teams").select("api_team_id").eq("api_season", season).eq("competition_code", competition.code));
  if (existing.length) return;
  const clubs = check(await db.from("football_clubs").select("id, name, api_team_id")) as { id: number; name: string; api_team_id: number | null }[];
  const rows = [];
  for (const { team } of await api.teams(competition.apiLeagueId, season)) {
    const byId = clubs.find((club) => club.api_team_id === team.id);
    const byName = matchClubName(team.name, clubs.map((club) => club.name));
    let club = byId ?? clubs.find((candidate) => candidate.name === byName);
    if (!club) {
      // Laget spiller ikke i ligaen i 2026/27, så vi har det ikke. Det lagres uten liga.
      const name = API_TEAM_ALIASES[team.name] ?? team.name;
      club = check(await db.from("football_clubs").insert({ name, api_team_id: team.id }).select("id, name, api_team_id").single()) as (typeof clubs)[number];
      clubs.push(club);
      console.log(`  ny klubb: ${name}`);
    } else if (club.api_team_id === null) {
      check(await db.from("football_clubs").update({ api_team_id: team.id }).eq("id", club.id));
      club.api_team_id = team.id;
    }
    rows.push({ api_season: season, api_team_id: team.id, competition_code: competition.code, club_id: club.id, api_name: team.name, logo_url: team.logo });
  }
  check(await db.from("football_season_teams").upsert(rows));
  console.log(`${competition.name}: ${rows.length} lag`);
}

// 2) Terminlista med status og resultat. Hentes hver gang, så resultatene holdes oppdatert.
async function syncFixtures(competition: (typeof FANTASY_COMPETITIONS)[number]) {
  const teams = new Set(check(await db.from("football_season_teams").select("api_team_id").eq("api_season", season).eq("competition_code", competition.code)).map((team) => team.api_team_id));
  const fixtures = (await api.fixtures(competition.apiLeagueId, season)).filter((item) => teams.has(item.teams.home.id) && teams.has(item.teams.away.id));
  const rows = fixtures.map((item) => ({
    api_fixture_id: item.fixture.id,
    api_season: season,
    competition_code: competition.code,
    round: item.league.round,
    kickoff_at: item.fixture.date,
    status: item.fixture.status.short,
    home_team_id: item.teams.home.id,
    away_team_id: item.teams.away.id,
    home_goals: item.goals.home,
    away_goals: item.goals.away,
    updated_at: new Date().toISOString(),
  }));
  for (let start = 0; start < rows.length; start += 500) check(await db.from("football_fixtures").upsert(rows.slice(start, start + 500)));
  console.log(`${competition.name}: ${rows.length} kamper`);
}

// 3) Stallene: spillerne, posisjonen deres og sesongstatistikken i ligaen.
async function syncSquad(team: { api_team_id: number; api_name: string; apiLeagueId: number }) {
  const { players, complete } = await api.teamPlayers(team.api_team_id, season);
  const withPosition = players.flatMap((item: ApiPlayer) => {
    const stats = item.statistics.find((entry) => entry.team.id === team.api_team_id && entry.games.position) ?? item.statistics.find((entry) => entry.games.position);
    const position = fantasyPosition(stats?.games.position ?? null);
    return position ? [{ item, position }] : [];
  });
  if (withPosition.length) {
    // catalog_id er ikke med her, så koblingen til katalogen beholdes. Den settes i steg 4.
    check(await db.from("football_players").upsert(withPosition.map(({ item }) => ({
      api_player_id: item.player.id,
      name: decodeApiText(item.player.name),
      first_name: item.player.firstname && decodeApiText(item.player.firstname),
      last_name: item.player.lastname && decodeApiText(item.player.lastname),
      photo_url: item.player.photo,
      updated_at: new Date().toISOString(),
    }))));
    check(await db.from("football_season_players").upsert(withPosition.map(({ item, position }) => ({ api_season: season, api_player_id: item.player.id, api_team_id: team.api_team_id, position }))));
    // Bare ligakampene for dette laget teller, ikke cup eller Europa.
    const statRows = withPosition.flatMap(({ item }) => {
      const league = item.statistics.find((entry) => entry.team.id === team.api_team_id && entry.league.id === team.apiLeagueId);
      if (!league) return [];
      const rating = league.games.rating === null ? null : Number(league.games.rating);
      return [{
        api_season: season,
        api_player_id: item.player.id,
        api_team_id: team.api_team_id,
        appearances: league.games.appearences ?? 0,
        minutes: league.games.minutes ?? 0,
        goals: league.goals.total ?? 0,
        assists: league.goals.assists ?? 0,
        goals_conceded: league.goals.conceded ?? 0,
        saves: league.goals.saves ?? 0,
        penalties_saved: league.penalty.saved ?? 0,
        penalties_missed: league.penalty.missed ?? 0,
        yellow_cards: league.cards.yellow ?? 0,
        red_cards: league.cards.red ?? 0,
        rating: rating !== null && Number.isFinite(rating) ? Math.round(rating * 100) / 100 : null,
        updated_at: new Date().toISOString(),
      }];
    });
    if (statRows.length) check(await db.from("football_player_season_stats").upsert(statRows));
  }
  check(await db.from("football_season_teams").update({ squad_synced_at: new Date().toISOString() }).eq("api_season", season).eq("api_team_id", team.api_team_id));
  console.log(`  ${team.api_name}: ${withPosition.length} spillere${complete ? "" : " (avkortet: gratisplanen gir bare 60 spillere per lag)"}`);
}

// Henter alle rader, 1000 om gangen. Uten genererte typer kjenner ikke Supabase radene, så T angis av den som kaller.
async function loadAll<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = check(await query(offset, offset + 999));
    rows.push(...(page as T[]));
    if (page.length < 1000) return rows;
  }
}

// Statistikken for hver spiller i en sesong (se seasonInputsFromRows i pricing.ts).
async function seasonInputs(forSeason: number) {
  const fixtures = await loadAll<{ home_team_id: number; away_team_id: number; home_goals: number | null; away_goals: number | null }>((from, to) =>
    db.from("football_fixtures").select("home_team_id, away_team_id, home_goals, away_goals").eq("api_season", forSeason).in("status", ["FT", "AET", "PEN"]).order("api_fixture_id").range(from, to));
  const rows = await loadAll<StatsRow>((from, to) => db.from("football_player_season_stats").select("*").eq("api_season", forSeason).order("api_player_id").order("api_team_id").range(from, to));
  return seasonInputsFromRows(rows, teamDefences(fixtures));
}

// 4) Kobler alle spillerne i sesongen til spillerkatalogen og setter fantasy-prisen ut fra
// poengene de har tatt denne og forrige sesong, og ratingen i katalogen. Bruker ingen
// forespørsler mot API-Football, så den kjøres hver gang og retter opp gamle koblinger.
async function matchAndPrice() {
  const catalog = await loadAll<CatalogCandidate & { overall: number }>((from, to) => db.from("player_catalog").select("id, name, club, overall").eq("active", true).order("id").range(from, to));
  const teams = await loadAll<{ api_team_id: number; football_clubs: { name: string } }>((from, to) =>
    db.from("football_season_teams").select("api_team_id, football_clubs (name)").eq("api_season", season).order("api_team_id").range(from, to));
  const clubByTeam = new Map(teams.map((team) => [team.api_team_id, team.football_clubs.name]));
  type SeasonPlayer = { api_player_id: number; api_team_id: number; position: FantasyPosition; price: number; price_change: number; football_players: { name: string; first_name: string | null; last_name: string | null; catalog_id: string | null } };
  const players = await loadAll<SeasonPlayer>((from, to) =>
    db.from("football_season_players").select("api_player_id, api_team_id, position, price, price_change, football_players (name, first_name, last_name, catalog_id)").eq("api_season", season).order("api_player_id").range(from, to));

  const found = players.flatMap((player) => {
    const match = matchCatalogPlayer(
      { name: player.football_players.name, firstName: player.football_players.first_name, lastName: player.football_players.last_name },
      clubByTeam.get(player.api_team_id) ?? "",
      catalog,
    );
    return match ? [{ player, match }] : [];
  });
  const catalogByPlayer = new Map(resolveDuplicateMatches(found).map(({ player, match }) => [player.api_player_id, match.candidate.id]));
  // Navn lagret før decodeApiText kom med kan fortsatt ha «&apos;», så de rettes samtidig.
  const changed = players
    .filter((player) => (catalogByPlayer.get(player.api_player_id) ?? null) !== player.football_players.catalog_id || decodeApiText(player.football_players.name) !== player.football_players.name)
    .map((player) => ({ api_player_id: player.api_player_id, name: decodeApiText(player.football_players.name), catalog_id: catalogByPlayer.get(player.api_player_id) ?? null }));
  for (let start = 0; start < changed.length; start += 500) check(await db.from("football_players").upsert(changed.slice(start, start + 500)));
  console.log(`Katalogen: ${catalogByPlayer.size} av ${players.length} spillere koblet (${changed.length} endret)`);

  // Når et lag har vært med i en runde, endres prisene bare av den automatiske jobben (litt etter hver runde).
  const { count: playedRounds, error: roundsError } = await db.from("fantasy_team_rounds").select("team_id, fantasy_teams!inner (api_season)", { count: "exact", head: true }).eq("fantasy_teams.api_season", season);
  if (roundsError) throw new Error(roundsError.message);
  if (playedRounds) {
    console.log("Priser: ikke endret, sesongen er i gang (den automatiske jobben endrer dem etter hver runde)");
    return;
  }
  const [current, previous] = await Promise.all([seasonInputs(season), seasonInputs(season - 1)]);
  const overallById = new Map(catalog.map((candidate) => [candidate.id, candidate.overall]));
  const repriced = players.flatMap((player) => {
    const catalogId = catalogByPlayer.get(player.api_player_id);
    const points = expectedPoints(player.position, current.get(player.api_player_id) ?? null, previous.get(player.api_player_id) ?? null);
    const price = fantasyPrice(player.position, points, catalogId ? overallById.get(catalogId) ?? null : null);
    // Startpriser har ingen prisendring å vise.
    return price === player.price && player.price_change === 0 ? [] : [{ api_season: season, api_player_id: player.api_player_id, api_team_id: player.api_team_id, position: player.position, price, price_change: 0 }];
  });
  for (let start = 0; start < repriced.length; start += 500) check(await db.from("football_season_players").upsert(repriced.slice(start, start + 500)));
  console.log(`Priser: ${repriced.length} endret (statistikk for ${current.size} spillere i ${season}/${String(season + 1).slice(2)}, ${previous.size} i ${season - 1}/${String(season).slice(2)})`);
}

console.log(`Sesong ${season}, maks ${maxRequests} forespørsler`);

for (const competition of competitions) {
  if (!budgetLeft(1)) break;
  await syncTeams(competition);
  if (!budgetLeft(1)) break;
  await syncFixtures(competition);
}

// Staller som ikke er hentet, eller som ble hentet før vi lagret statistikk, hentes (på nytt).
const seasonTeams = check(await db
  .from("football_season_teams")
  .select("api_team_id, api_name, competition_code, squad_synced_at")
  .eq("api_season", season)
  .in("competition_code", competitions.map((competition) => competition.code))
  .order("competition_code")
  .order("api_name")) as { api_team_id: number; api_name: string; competition_code: string; squad_synced_at: string | null }[];
const teamsWithStats = new Set((await loadAll<{ api_team_id: number }>((from, to) =>
  db.from("football_player_season_stats").select("api_team_id").eq("api_season", season).order("api_team_id").range(from, to))).map((row) => row.api_team_id));
const pending = seasonTeams.filter((team) => team.squad_synced_at === null || !teamsWithStats.has(team.api_team_id));

let squadsDone = 0;
if (pending.length) console.log(`Staller: ${pending.length} gjenstår`);
for (const team of pending) {
  if (!budgetLeft(REQUESTS_PER_SQUAD)) break;
  const apiLeagueId = FANTASY_COMPETITIONS.find((competition) => competition.code === team.competition_code)!.apiLeagueId;
  await syncSquad({ api_team_id: team.api_team_id, api_name: team.api_name, apiLeagueId });
  squadsDone += 1;
}

await matchAndPrice();

console.log(`Ferdig: ${api.requestsMade} forespørsler brukt${api.remainingToday === null ? "" : `, ${api.remainingToday} igjen i dag`}.`);
if (pending.length > squadsDone) console.log(`${pending.length - squadsDone} staller gjenstår. Kjør skriptet igjen i morgen.`);
