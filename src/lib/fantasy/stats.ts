import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Chip } from "./points";

// Statistikk-fanen og rundehistorikken, som i Premier League Fantasy. Bare runder som er låst.

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

// Plassering etter poeng, høyest først. Like poeng gir lik plassering.
function ranks(points: ReadonlyMap<string, number>) {
  const sorted = [...points].sort((a, b) => b[1] - a[1]);
  const result = new Map<string, number>();
  sorted.forEach(([id, value], index) => result.set(id, index > 0 && sorted[index - 1][1] === value ? result.get(sorted[index - 1][0])! : index + 1));
  return result;
}

type TeamRoundRow = { team_id: string; round_number: number; points: number; captain_id: number; vice_captain_id: number; chip: Chip | null; transfers: number };

function seasonTeamRounds(db: Db, season: number, columns: string, rounds?: number[]) {
  return loadAll<TeamRoundRow>((from, to) => {
    let query = db.from("fantasy_team_rounds").select(`${columns}, fantasy_teams!inner (api_season)`).eq("fantasy_teams.api_season", season);
    if (rounds) query = query.in("round_number", rounds);
    return query.order("team_id").order("round_number").range(from, to);
  });
}

// En spiller og et tall: poeng, antall lag eller prosent av lagene.
export type StatEntry = { playerId: number; value: number };

export type RoundStats = {
  round: number;
  teams: number;
  averagePoints: number;
  highest: { teamId: string; teamName: string; username: string; points: number } | null;
  transfersMade: number;
  // Poengene til alle spillere som spilte i runden (for Dream Team og rundens spiller).
  playerPoints: StatEntry[];
  mostSelected: StatEntry[];
  mostCaptained: StatEntry[];
  mostViceCaptained: StatEntry[];
  transfersIn: StatEntry[];
  transfersOut: StatEntry[];
  chipsPlayed: { chip: Chip; count: number }[];
};

const TOP = 5;

function top(counts: ReadonlyMap<number, number>, total = 0) {
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, TOP)
    .map(([playerId, count]) => ({ playerId, value: total ? Math.round((count / total) * 1000) / 10 : count }));
}

function tally<T>(ids: Iterable<T>) {
  const counts = new Map<T, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

// Tallene for én runde (som rundestatusen i FPL).
export async function getRoundStats(season: number, round: number): Promise<RoundStats> {
  const db = supabaseAdmin();
  const [fixtures, teamRounds] = await Promise.all([
    check(await db.from("football_fixtures").select("api_fixture_id").eq("api_season", season).eq("round_number", round)),
    seasonTeamRounds(db, season, "team_id, round_number, points, captain_id, vice_captain_id, chip, transfers"),
  ]);
  const lines = fixtures.length
    ? await loadAll<{ api_player_id: number; points: number; minutes: number }>((from, to) =>
      db.from("football_fixture_players").select("api_player_id, points, minutes").in("api_fixture_id", fixtures.map((fixture) => fixture.api_fixture_id)).order("api_fixture_id").order("api_player_id").range(from, to))
    : [];
  const playerPoints = new Map<number, number>();
  for (const line of lines) if (line.minutes > 0) playerPoints.set(line.api_player_id, (playerPoints.get(line.api_player_id) ?? 0) + line.points);

  const thisRound = teamRounds.filter((row) => row.round_number === round);
  // Laget før runden: forrige runde, men ikke en Free Hit-runde (da ble laget satt tilbake etterpå).
  const previousRound = new Map<string, number>();
  for (const row of teamRounds) {
    if (row.round_number < round && row.chip !== "free_hit") previousRound.set(row.team_id, row.round_number);
  }
  const neededRounds = [...new Set([round, ...previousRound.values()])];
  const picks = thisRound.length
    ? await loadAll<{ team_id: string; round_number: number; api_player_id: number }>((from, to) =>
      db.from("fantasy_team_round_players").select("team_id, round_number, api_player_id").in("round_number", neededRounds).in("team_id", thisRound.map((row) => row.team_id)).order("team_id").order("round_number").order("api_player_id").range(from, to))
    : [];
  const squads = new Map<string, Set<number>>();
  for (const pick of picks) {
    const key = `${pick.team_id}:${pick.round_number}`;
    if (!squads.has(key)) squads.set(key, new Set());
    squads.get(key)!.add(pick.api_player_id);
  }
  const transfersIn: number[] = [];
  const transfersOut: number[] = [];
  for (const row of thisRound) {
    const before = previousRound.has(row.team_id) ? squads.get(`${row.team_id}:${previousRound.get(row.team_id)}`) : undefined;
    const now = squads.get(`${row.team_id}:${round}`);
    if (!before || !now) continue;
    for (const id of now) if (!before.has(id)) transfersIn.push(id);
    for (const id of before) if (!now.has(id)) transfersOut.push(id);
  }

  const best = [...thisRound].sort((a, b) => b.points - a.points)[0];
  const highestTeam = best
    ? check(await db.from("fantasy_teams").select("id, name, profiles (username)").eq("id", best.team_id).maybeSingle()) as unknown as { id: string; name: string; profiles: { username: string } } | null
    : null;
  const chips = tally(thisRound.flatMap((row) => (row.chip ? [row.chip] : [])));

  return {
    round,
    teams: thisRound.length,
    averagePoints: thisRound.length ? Math.round(thisRound.reduce((sum, row) => sum + row.points, 0) / thisRound.length) : 0,
    highest: best && highestTeam ? { teamId: highestTeam.id, teamName: highestTeam.name, username: highestTeam.profiles.username, points: best.points } : null,
    transfersMade: thisRound.reduce((sum, row) => sum + row.transfers, 0),
    playerPoints: [...playerPoints].map(([playerId, value]) => ({ playerId, value })),
    mostSelected: top(tally(picks.filter((pick) => pick.round_number === round).map((pick) => pick.api_player_id)), thisRound.length),
    mostCaptained: top(tally(thisRound.map((row) => row.captain_id)), thisRound.length),
    mostViceCaptained: top(tally(thisRound.map((row) => row.vice_captain_id)), thisRound.length),
    transfersIn: top(tally(transfersIn)),
    transfersOut: top(tally(transfersOut)),
    chipsPlayed: [...chips].map(([chip, count]) => ({ chip, count })),
  };
}

// Én rad i rundehistorikken, med de samme kolonnene som i FPL.
export type HistoryRow = {
  round: number;
  points: number;
  benchPoints: number;
  roundRank: number;
  transfers: number;
  transferCost: number;
  totalPoints: number;
  overallRank: number;
  // Prisen på de 15 spillerne ved fristen pluss banken, i tideler.
  value: number;
  chip: Chip | null;
};

export type TeamHistory = { teamId: string; teamName: string; username: string; teams: number; rows: HistoryRow[] };

export async function getTeamHistory(season: number, teamId: string): Promise<TeamHistory | null> {
  const db = supabaseAdmin();
  const team = check(await db.from("fantasy_teams").select("id, name, profiles (username)").eq("id", teamId).eq("api_season", season).maybeSingle()) as unknown as { id: string; name: string; profiles: { username: string } } | null;
  if (!team) return null;
  const [all, own, picks] = await Promise.all([
    seasonTeamRounds(db, season, "team_id, round_number, points"),
    check(await db.from("fantasy_team_rounds").select("round_number, points, bench_points, transfers, transfer_cost, chip, bank").eq("team_id", teamId).order("round_number")),
    check(await db.from("fantasy_team_round_players").select("round_number, api_player_id, purchase_price").eq("team_id", teamId)),
  ]);
  const rounds = own.map((row) => row.round_number);
  const prices = rounds.length && picks.length
    ? await loadAll<{ round_number: number; api_player_id: number; price: number }>((from, to) =>
      db.from("fantasy_player_round_prices").select("round_number, api_player_id, price").eq("api_season", season).in("round_number", rounds).in("api_player_id", [...new Set(picks.map((pick) => pick.api_player_id))]).order("round_number").order("api_player_id").range(from, to))
    : [];
  const priceAt = new Map(prices.map((row) => [`${row.round_number}:${row.api_player_id}`, row.price]));

  // Poeng per lag per runde, så vi kan regne ut plasseringen i runden og totalt etter runden.
  const byRound = new Map<number, Map<string, number>>();
  for (const row of all) {
    if (!byRound.has(row.round_number)) byRound.set(row.round_number, new Map());
    byRound.get(row.round_number)!.set(row.team_id, row.points);
  }
  const totals = new Map<string, number>();
  const rows: HistoryRow[] = [];
  const allTeams = new Set(all.map((row) => row.team_id));
  for (const roundNumber of [...byRound.keys()].sort((a, b) => a - b)) {
    const roundPoints = byRound.get(roundNumber)!;
    for (const [id, points] of roundPoints) totals.set(id, (totals.get(id) ?? 0) + points);
    const mine = own.find((row) => row.round_number === roundNumber);
    if (!mine) continue;
    const squad = picks.filter((pick) => pick.round_number === roundNumber);
    rows.push({
      round: roundNumber,
      points: mine.points,
      benchPoints: mine.bench_points,
      roundRank: ranks(roundPoints).get(teamId) ?? 0,
      transfers: mine.transfers,
      transferCost: mine.transfer_cost,
      totalPoints: totals.get(teamId) ?? 0,
      overallRank: ranks(totals).get(teamId) ?? 0,
      // Runder fra før prisene ble lagret ved fristen bruker kjøpsprisen.
      value: mine.bank + squad.reduce((sum, pick) => sum + (priceAt.get(`${roundNumber}:${pick.api_player_id}`) ?? pick.purchase_price), 0),
      chip: mine.chip,
    });
  }
  return { teamId: team.id, teamName: team.name, username: team.profiles.username, teams: allTeams.size, rows };
}
