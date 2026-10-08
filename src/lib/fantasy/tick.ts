import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ApiFootballClient, fantasyPosition, type ApiFixture } from "./api-football";
import { FANTASY_COMPETITIONS } from "./competitions";
import { CANCELLED_STATUSES, FINISHED_STATUSES, fixtureLines } from "./fixture-lines";
import { fixtureBonus, scoreLine, teamRoundPoints, type Chip, type RoundPlayer } from "./points";
import { expectedPoints, fantasyPrice, seasonInputsFromRows, teamDefences, type StatsRow } from "./pricing";
import type { FantasyPosition } from "./squad-rules";

// Den automatiske jobben i Fantasy. Kalles hvert andre minutt av Supabase (pg_cron + pg_net)
// via /api/fantasy/tick. Hver kjøring gjør det som trengs akkurat nå:
//   1. henter terminlista på nytt (maks én gang i timen) og lager rundene
//   2. låser lagene når fristen har gått ut
//   3. henter kamper som pågår eller nettopp er ferdige, og regner ut poengene
//   4. regner ut poengene til alle lag i runder som pågår
//   5. avslutter ferdige runder: setter Free Hit-lag tilbake og endrer prisene
//   6. henter stallene på nytt én gang i uka, så nye spillere kommer med

const FIXTURES_REFRESH_MS = 60 * 60 * 1000;
const SQUADS_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
// Runder som låses mer enn så mye for sent, låses uten lag (se lock_fantasy_round).
const CATCH_UP_LIMIT_MS = 6 * 60 * 60 * 1000;
// En kamp regnes som ferdig så lenge etter avspark (for den simulerte klokka i testsesongen).
const MATCH_LENGTH_MS = 115 * 60 * 1000;
// Ferdige kamper hentes på nytt i så lang tid etter avspark, så rettelser i statistikken kommer med.
const CORRECTIONS_MS = 8 * 60 * 60 * 1000;
// Prisen endres maks 0,2 mill. per runde.
const MAX_PRICE_STEP = 2;
// Stopp de valgfrie stegene etter så lang tid, så kjøringen holder seg godt under grensa på 60 s.
const TIME_BUDGET_MS = 40_000;

type Db = ReturnType<typeof supabaseAdmin>;
type FixtureRow = { api_fixture_id: number; home_team_id: number; away_team_id: number; kickoff_at: string; status: string; home_goals: number | null; away_goals: number | null; round_number: number | null; details_synced_at: string | null };

export type TickReport = { season: number | null; now: string; steps: string[] };

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data as NonNullable<T>;
}

// Henter alle rader, 1000 om gangen.
async function loadAll<T>(query: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = check(await query(offset, offset + 999));
    rows.push(...(page as T[]));
    if (page.length < 1000) return rows;
  }
}

async function inChunks<T>(rows: readonly T[], size: number, write: (chunk: T[]) => PromiseLike<{ error: { message: string } | null }>) {
  for (let start = 0; start < rows.length; start += size) {
    const { error } = await write(rows.slice(start, start + size));
    if (error) throw new Error(error.message);
  }
}

// Om kampen er ferdig sett fra «nå» (som kan være den simulerte klokka i testsesongen).
function isDone(fixture: Pick<FixtureRow, "status" | "kickoff_at">, now: Date) {
  if (CANCELLED_STATUSES.includes(fixture.status)) return true;
  return FINISHED_STATUSES.includes(fixture.status) && new Date(fixture.kickoff_at).getTime() + MATCH_LENGTH_MS <= now.getTime();
}

export async function runFantasyTick(options: { forceFixtures?: boolean } = {}): Promise<TickReport> {
  const started = Date.now();
  const db = supabaseAdmin();
  const steps: string[] = [];
  const seasonRow = check(await db.from("fantasy_seasons").select("api_season, simulated_now, fixtures_synced_at").eq("is_current", true).maybeSingle());
  if (!seasonRow) return { season: null, now: new Date().toISOString(), steps: ["Ingen sesong er satt som gjeldende"] };
  const season: number = seasonRow.api_season;
  const simulated = seasonRow.simulated_now !== null;
  const now = simulated ? new Date(seasonRow.simulated_now) : new Date();
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("Mangler API_FOOTBALL_KEY");
  const api = new ApiFootballClient(key);

  // 1) Terminlista og rundene.
  const lastFixtures = seasonRow.fixtures_synced_at ? new Date(seasonRow.fixtures_synced_at).getTime() : 0;
  if (options.forceFixtures || Date.now() - lastFixtures > FIXTURES_REFRESH_MS) {
    try {
      steps.push(await refreshFixtures(db, api, season));
      check(await db.from("fantasy_seasons").update({ fixtures_synced_at: new Date().toISOString() }).eq("api_season", season));
    } catch (error) {
      steps.push(`Terminliste: feilet (${error instanceof Error ? error.message : String(error)})`);
    }
    check(await db.rpc("sync_fantasy_rounds", { target_season: season }));
  }

  // 2) Lås runder der fristen har gått ut.
  const due = check(await db.from("fantasy_rounds").select("number, deadline_at").eq("api_season", season).is("locked_at", null).lte("deadline_at", now.toISOString()).order("number"));
  for (const round of due) {
    const includeTeams = now.getTime() - new Date(round.deadline_at).getTime() < CATCH_UP_LIMIT_MS;
    const locked = check(await db.rpc("lock_fantasy_round", { target_season: season, target_round: round.number, include_teams: includeTeams }));
    // Prisen ved fristen, som vises ved kampene i runden i spillervinduet. Feiler den, går resten av jobben videre.
    const { error: priceError } = await db.rpc("snapshot_fantasy_round_prices", { target_season: season, target_round: round.number });
    if (priceError) steps.push(`Runde ${round.number}: prisene ble ikke lagret (${priceError.message})`);
    steps.push(`Runde ${round.number} låst (${includeTeams ? `${locked} lag` : "uten lag, fristen var for lenge siden"})`);
  }

  // 3) Kamper som har startet og ikke er ferdig behandlet. Feiler API-et, fortsetter resten av jobben.
  try {
    steps.push(await refreshFixtureDetails(db, api, season, now));
  } catch (error) {
    steps.push(`Kamper: feilet (${error instanceof Error ? error.message : String(error)})`);
  }

  // 4) Poengene i runder som pågår.
  const openRounds = check(await db.from("fantasy_rounds").select("number, ends_at").eq("api_season", season).not("locked_at", "is", null).is("finished_at", null).order("number"));
  for (const round of openRounds) steps.push(await computeRound(db, season, round.number, now));

  // 5) Avslutt runder der uka er over og alle kampene er ferdige.
  for (const round of openRounds) {
    if (new Date(round.ends_at).getTime() > now.getTime()) continue;
    const fixtures = check(await db.from("football_fixtures").select("status, kickoff_at, details_synced_at").eq("api_season", season).eq("round_number", round.number));
    const allDone = fixtures.every((fixture) => isDone(fixture, now) && (CANCELLED_STATUSES.includes(fixture.status) || fixture.details_synced_at !== null));
    if (!allDone) continue;
    check(await db.rpc("finish_fantasy_round", { target_season: season, target_round: round.number }));
    steps.push(`Runde ${round.number} ferdig`);
    // Runder uten lag (spilt før Fantasy ble slått på) endrer ikke prisene; startprisene er satt av fantasy:sync.
    const { count: teams } = await db.from("fantasy_team_rounds").select("team_id, fantasy_teams!inner (api_season)", { count: "exact", head: true }).eq("round_number", round.number).eq("fantasy_teams.api_season", season);
    if (teams) steps.push(await updatePrices(db, season, now));
  }

  // 6) Stallene, én gang i uka. Ikke i testsesongen: API-et gir bare dagens stall.
  if (!simulated && Date.now() - started < TIME_BUDGET_MS) steps.push(await refreshSquads(db, api, season, started));

  steps.push(`${api.requestsMade} forespørsler mot API-Football`);
  return { season, now: now.toISOString(), steps };
}

async function refreshFixtures(db: Db, api: ApiFootballClient, season: number) {
  const teams = await loadAll<{ api_team_id: number; competition_code: string }>((from, to) => db.from("football_season_teams").select("api_team_id, competition_code").eq("api_season", season).order("api_team_id").range(from, to));
  const known = new Set(teams.map((team) => team.api_team_id));
  let total = 0;
  for (const competition of FANTASY_COMPETITIONS) {
    if (!teams.some((team) => team.competition_code === competition.code)) continue;
    const fixtures = (await api.fixtures(competition.apiLeagueId, season)).filter((item: ApiFixture) => known.has(item.teams.home.id) && known.has(item.teams.away.id));
    await inChunks(fixtures.map((item) => ({
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
    })), 500, (chunk) => db.from("football_fixtures").upsert(chunk));
    total += fixtures.length;
  }
  return `Terminliste: ${total} kamper`;
}

async function seasonPlayerMap(db: Db, season: number) {
  const rows = await loadAll<{ api_player_id: number; api_team_id: number; position: FantasyPosition; price: number }>((from, to) =>
    db.from("football_season_players").select("api_player_id, api_team_id, position, price").eq("api_season", season).order("api_player_id").range(from, to));
  return new Map(rows.map((row) => [row.api_player_id, row]));
}

const KICKOFF_POSITION: Record<string, FantasyPosition> = { G: "GK", D: "DEF", M: "MID", F: "FWD" };

async function refreshFixtureDetails(db: Db, api: ApiFootballClient, season: number, now: Date) {
  const candidates = check(await db
    .from("football_fixtures")
    .select("api_fixture_id, kickoff_at, status, details_synced_at")
    .eq("api_season", season)
    .lte("kickoff_at", now.toISOString())
    .not("status", "in", `(${CANCELLED_STATUSES.join(",")})`)
    .order("kickoff_at")
    .limit(2000)) as Pick<FixtureRow, "api_fixture_id" | "kickoff_at" | "status" | "details_synced_at">[];
  const wanted = candidates.filter((fixture) =>
    fixture.details_synced_at === null || !FINISHED_STATUSES.includes(fixture.status) || now.getTime() - new Date(fixture.kickoff_at).getTime() < CORRECTIONS_MS).slice(0, 200);
  if (!wanted.length) return "Kamper: ingen å hente";

  const players = await seasonPlayerMap(db, season);
  const details = await api.fixtureDetails(wanted.map((fixture) => fixture.api_fixture_id));
  let lines = 0;
  for (const fixture of details) {
    const fixtureLinesList = fixtureLines(fixture);
    // Spillere som ikke er i stallene våre (f.eks. nye unge spillere), legges til med posisjonen fra kampen.
    const unknown = fixture.players.flatMap((team) => team.players.flatMap((entry) => {
      const position = KICKOFF_POSITION[entry.statistics[0]?.games.position ?? ""];
      return players.has(entry.player.id) || !position ? [] : [{ id: entry.player.id, name: entry.player.name, teamId: team.team.id, position }];
    }));
    if (unknown.length) {
      check(await db.from("football_players").upsert(unknown.map((player) => ({ api_player_id: player.id, name: player.name, updated_at: new Date().toISOString() })), { ignoreDuplicates: true }));
      const rows = unknown.map((player) => ({ api_season: season, api_player_id: player.id, api_team_id: player.teamId, position: player.position, price: fantasyPrice(player.position, null, null) }));
      const { error } = await db.from("football_season_players").upsert(rows, { ignoreDuplicates: true });
      // Laget kan mangle i sesongen (f.eks. en spiller som byttet fra en annen liga); da hopper vi over ham.
      if (!error) for (const row of rows) players.set(row.api_player_id, row);
    }
    const bonus = fixtureBonus(fixtureLinesList);
    const rows = fixtureLinesList.flatMap((line) => {
      const position = players.get(line.playerId)?.position;
      if (!position) return [];
      const { total, breakdown } = scoreLine(position, line, bonus.get(line.playerId) ?? 0);
      return [{
        api_fixture_id: fixture.fixture.id,
        api_player_id: line.playerId,
        api_team_id: line.teamId,
        minutes: line.minutes,
        goals: line.goals,
        assists: line.assists,
        saves: line.saves,
        penalties_saved: line.penaltiesSaved,
        penalties_missed: line.penaltiesMissed,
        yellow_cards: line.yellowCards,
        red_cards: line.redCards,
        own_goals: line.ownGoals,
        goals_conceded: line.goalsConceded,
        defensive_actions: line.defensiveActions,
        rating: line.rating,
        bonus: breakdown.bonus,
        points: total,
        breakdown,
      }];
    });
    await inChunks(rows, 500, (chunk) => db.from("football_fixture_players").upsert(chunk));
    lines += rows.length;
    check(await db.from("football_fixtures").update({
      status: fixture.fixture.status.short,
      home_goals: fixture.goals.home,
      away_goals: fixture.goals.away,
      details_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("api_fixture_id", fixture.fixture.id));
  }
  return `Kamper: ${details.length} hentet, ${lines} spillerlinjer`;
}

type TeamRoundRow = { team_id: string; round_number: number; captain_id: number; vice_captain_id: number; chip: Chip | null; transfers: number; transfer_cost: number; bank: number };
type RoundPickRow = { team_id: string; api_player_id: number; slot: number; purchase_price: number };

// Regner ut poengene til alle lag i én runde.
async function computeRound(db: Db, season: number, round: number, now: Date) {
  const fixtures = check(await db.from("football_fixtures").select("api_fixture_id, home_team_id, away_team_id, kickoff_at, status").eq("api_season", season).eq("round_number", round)) as Pick<FixtureRow, "api_fixture_id" | "home_team_id" | "away_team_id" | "kickoff_at" | "status">[];
  const teamDone = new Map<number, boolean>();
  for (const fixture of fixtures) {
    for (const teamId of [fixture.home_team_id, fixture.away_team_id]) teamDone.set(teamId, (teamDone.get(teamId) ?? true) && isDone(fixture, now));
  }
  const started = fixtures.filter((fixture) => new Date(fixture.kickoff_at).getTime() <= now.getTime()).map((fixture) => fixture.api_fixture_id);
  const lines = started.length
    ? await loadAll<{ api_player_id: number; points: number; minutes: number }>((from, to) =>
      db.from("football_fixture_players").select("api_player_id, points, minutes").in("api_fixture_id", started).order("api_fixture_id").order("api_player_id").range(from, to))
    : [];
  const byPlayer = new Map<number, { points: number; minutes: number }>();
  for (const line of lines) {
    const current = byPlayer.get(line.api_player_id) ?? { points: 0, minutes: 0 };
    byPlayer.set(line.api_player_id, { points: current.points + line.points, minutes: current.minutes + line.minutes });
  }
  const seasonPlayers = await seasonPlayerMap(db, season);

  const teamRounds = await loadAll<TeamRoundRow>((from, to) =>
    db.from("fantasy_team_rounds").select("team_id, round_number, captain_id, vice_captain_id, chip, transfers, transfer_cost, bank, fantasy_teams!inner (api_season)").eq("round_number", round).eq("fantasy_teams.api_season", season).order("team_id").range(from, to));
  if (!teamRounds.length) return `Runde ${round}: ingen lag`;
  const picks = await loadAll<RoundPickRow>((from, to) =>
    db.from("fantasy_team_round_players").select("team_id, api_player_id, slot, purchase_price").eq("round_number", round).in("team_id", teamRounds.map((row) => row.team_id)).order("team_id").order("slot").range(from, to));
  const picksByTeam = new Map<string, RoundPickRow[]>();
  for (const pick of picks) picksByTeam.set(pick.team_id, [...(picksByTeam.get(pick.team_id) ?? []), pick]);

  const roundPlayer = (id: number): RoundPlayer => {
    const info = seasonPlayers.get(id);
    const played = byPlayer.get(id) ?? { points: 0, minutes: 0 };
    // Laget hans spiller ikke i runden: da er han «ferdig» med 0 minutter og kan byttes ut.
    const done = info ? teamDone.get(info.api_team_id) ?? true : true;
    return { playerId: id, position: info?.position ?? "MID", points: played.points, minutes: played.minutes, done };
  };

  const teamUpdates: (TeamRoundRow & { points: number; bench_points: number; effective_captain_id: number | null })[] = [];
  const playerUpdates: (RoundPickRow & { round_number: number; points: number; multiplier: number; subbed_in: boolean; subbed_out: boolean })[] = [];
  for (const teamRound of teamRounds) {
    const teamPicks = picksByTeam.get(teamRound.team_id) ?? [];
    const players = new Map(teamPicks.map((pick) => [pick.api_player_id, roundPlayer(pick.api_player_id)]));
    const result = teamRoundPoints({
      picks: teamPicks.map((pick) => ({ playerId: pick.api_player_id, slot: pick.slot })),
      captainId: teamRound.captain_id,
      viceCaptainId: teamRound.vice_captain_id,
      chip: teamRound.chip,
      transferCost: teamRound.transfer_cost,
      players,
    });
    const { team_id, round_number, captain_id, vice_captain_id, chip, transfers, transfer_cost, bank } = teamRound;
    teamUpdates.push({ team_id, round_number, captain_id, vice_captain_id, chip, transfers, transfer_cost, bank, points: result.points, bench_points: result.benchPoints, effective_captain_id: result.captainId });
    for (const line of result.lines) {
      const pick = teamPicks.find((item) => item.api_player_id === line.playerId)!;
      playerUpdates.push({ ...pick, round_number: round, points: line.points, multiplier: line.multiplier, subbed_in: line.subbedIn, subbed_out: line.subbedOut });
    }
  }
  await inChunks(teamUpdates, 500, (chunk) => db.from("fantasy_team_rounds").upsert(chunk));
  await inChunks(playerUpdates, 1000, (chunk) => db.from("fantasy_team_round_players").upsert(chunk));
  return `Runde ${round}: poeng for ${teamUpdates.length} lag`;
}

// Etter en runde: prisen flyttes mot det poengene tilsier (pricing.ts), maks 0,2 mill.
async function updatePrices(db: Db, season: number, now: Date) {
  const finishedFixtures = (await loadAll<FixtureRow>((from, to) =>
    db.from("football_fixtures").select("api_fixture_id, home_team_id, away_team_id, kickoff_at, status, home_goals, away_goals").eq("api_season", season).in("status", FINISHED_STATUSES).order("api_fixture_id").range(from, to)))
    .filter((fixture) => isDone(fixture, now));
  const fixtureIds = new Set(finishedFixtures.map((fixture) => fixture.api_fixture_id));
  type LineRow = { api_fixture_id: number; api_player_id: number; api_team_id: number; minutes: number; goals: number; assists: number; goals_conceded: number; saves: number; penalties_saved: number; penalties_missed: number; yellow_cards: number; red_cards: number; rating: number | string | null };
  const lines = (await loadAll<LineRow>((from, to) =>
    db.from("football_fixture_players").select("api_fixture_id, api_player_id, api_team_id, minutes, goals, assists, goals_conceded, saves, penalties_saved, penalties_missed, yellow_cards, red_cards, rating, football_fixtures!inner (api_season)").eq("football_fixtures.api_season", season).order("api_fixture_id").order("api_player_id").range(from, to)))
    .filter((line) => fixtureIds.has(line.api_fixture_id) && line.minutes > 0);

  // Summer kampene til sesongtall per spiller og lag, samme form som football_player_season_stats.
  const totals = new Map<string, StatsRow & { ratingSum: number; ratedApps: number }>();
  for (const line of lines) {
    const key = `${line.api_player_id}:${line.api_team_id}`;
    const row = totals.get(key) ?? { api_player_id: line.api_player_id, api_team_id: line.api_team_id, appearances: 0, minutes: 0, goals: 0, assists: 0, goals_conceded: 0, saves: 0, penalties_saved: 0, penalties_missed: 0, yellow_cards: 0, red_cards: 0, rating: null, ratingSum: 0, ratedApps: 0 };
    row.appearances += 1;
    row.minutes += line.minutes;
    row.goals += line.goals;
    row.assists += line.assists;
    row.goals_conceded += line.goals_conceded;
    row.saves += line.saves;
    row.penalties_saved += line.penalties_saved;
    row.penalties_missed += line.penalties_missed;
    row.yellow_cards += line.yellow_cards;
    row.red_cards += line.red_cards;
    if (line.rating !== null) {
      row.ratingSum += Number(line.rating);
      row.ratedApps += 1;
    }
    totals.set(key, row);
  }
  const currentRows: StatsRow[] = [...totals.values()].map(({ ratingSum, ratedApps, ...row }) => ({ ...row, rating: ratedApps ? ratingSum / ratedApps : null }));
  const current = seasonInputsFromRows(currentRows, teamDefences(finishedFixtures));

  const previousFixtures = await loadAll<FixtureRow>((from, to) =>
    db.from("football_fixtures").select("home_team_id, away_team_id, home_goals, away_goals").eq("api_season", season - 1).in("status", FINISHED_STATUSES).order("api_fixture_id").range(from, to));
  const previousRows = await loadAll<StatsRow>((from, to) => db.from("football_player_season_stats").select("*").eq("api_season", season - 1).order("api_player_id").order("api_team_id").range(from, to));
  const previous = seasonInputsFromRows(previousRows, teamDefences(previousFixtures));

  const players = await loadAll<{ api_player_id: number; api_team_id: number; position: FantasyPosition; price: number; football_players: { player_catalog: { overall: number } | null } }>((from, to) =>
    db.from("football_season_players").select("api_player_id, api_team_id, position, price, football_players (player_catalog (overall))").eq("api_season", season).order("api_player_id").range(from, to));
  const changes = players.flatMap((player) => {
    const points = expectedPoints(player.position, current.get(player.api_player_id) ?? null, previous.get(player.api_player_id) ?? null);
    const target = fantasyPrice(player.position, points, player.football_players.player_catalog?.overall ?? null);
    const next = player.price + Math.max(-MAX_PRICE_STEP, Math.min(MAX_PRICE_STEP, target - player.price));
    return [{ api_season: season, api_player_id: player.api_player_id, api_team_id: player.api_team_id, position: player.position, price: next, price_change: next - player.price }];
  });
  await inChunks(changes, 500, (chunk) => db.from("football_season_players").upsert(chunk));
  return `Priser: ${changes.filter((change) => change.price_change !== 0).length} endret`;
}

// Nye spillere og overganger: dagens stall for lagene som ikke er hentet på en uke.
async function refreshSquads(db: Db, api: ApiFootballClient, season: number, started: number) {
  const cutoff = new Date(Date.now() - SQUADS_REFRESH_MS).toISOString();
  const teams = check(await db.from("football_season_teams").select("api_team_id, squad_synced_at").eq("api_season", season).or(`squad_synced_at.is.null,squad_synced_at.lt.${cutoff}`).limit(15)) as { api_team_id: number }[];
  if (!teams.length) return "Staller: oppdatert";
  const known = await seasonPlayerMap(db, season);
  let added = 0;
  let done = 0;
  for (const team of teams) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const squad = (await api.squad(team.api_team_id)).flatMap((player) => {
      const position = fantasyPosition(player.position);
      return position ? [{ id: player.id, name: player.name, photo: player.photo, position: position as FantasyPosition }] : [];
    });
    if (squad.length) {
      check(await db.from("football_players").upsert(squad.map((player) => ({ api_player_id: player.id, name: player.name, photo_url: player.photo, updated_at: new Date().toISOString() }))));
      // Nye spillere får prisen ratingen tilsier; spillere vi har fra før beholder prisen sin.
      check(await db.from("football_season_players").upsert(squad.map((player) => ({
        api_season: season,
        api_player_id: player.id,
        api_team_id: team.api_team_id,
        position: known.get(player.id)?.position ?? player.position,
        price: known.get(player.id)?.price ?? fantasyPrice(player.position, null, null),
      }))));
      added += squad.filter((player) => !known.has(player.id)).length;
    }
    check(await db.from("football_season_teams").update({ squad_synced_at: new Date().toISOString() }).eq("api_season", season).eq("api_team_id", team.api_team_id));
    done += 1;
  }
  return `Staller: ${done} lag oppdatert, ${added} nye spillere`;
}
