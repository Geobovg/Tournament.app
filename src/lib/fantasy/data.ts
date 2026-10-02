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
} & FantasyPhoto;

// Et utklipp uten bakgrunn når vi har et: fra managerkarrieren, ellers hentet til fantasy med
// scripts/fantasy-cutouts.ts. Uten utklipp brukes ansiktsbildet fra API-Football (hvit bakgrunn).
export type FantasyPhoto = { photo: string | null; photoCutout: boolean };

// Drakten som vises på banen (som i FPL): keeperdrakten for keepere når den finnes, ellers
// hjemmedrakten. Klubber uten drakt i public/fantasy-kits får null, og kortet viser bildet.
function clubKit(clubName: string, position: FantasyPosition) {
  const slug = kitSlug(clubName);
  const file = [position === "GK" ? `${slug}-gk.png` : null, `${slug}-home.png`].find((name) => name && FANTASY_KIT_FILES.has(name));
  return file ? `/fantasy-kits/${file}` : null;
}

function fantasyPhoto(apiPlayerId: number, slug: string | undefined, apiPhoto: string | null): FantasyPhoto {
  const cutout = (slug ? playerPhoto(slug) : null) ?? (FANTASY_CUTOUT_IDS.has(apiPlayerId) ? `/fantasy-players/${apiPlayerId}.png` : null);
  return cutout ? { photo: cutout, photoCutout: true } : { photo: apiPhoto, photoCutout: false };
}

type SeasonPlayerRow = {
  api_player_id: number;
  position: FantasyPosition;
  price: number;
  price_change: number;
  football_players: { name: string; photo_url: string | null; player_catalog: { name: string; slug: string } | null };
  football_season_teams: { club_id: number; competition_code: CompetitionCode; football_clubs: { name: string } };
};

// Poeng hver spiller har tatt i sesongen så langt.
async function seasonPoints(db: Db, season: number) {
  const rows = await loadAll<{ api_player_id: number; points: number }>((from, to) =>
    db.from("football_fixture_players").select("api_player_id, points, football_fixtures!inner (api_season)").eq("football_fixtures.api_season", season).order("api_fixture_id").order("api_player_id").range(from, to));
  const totals = new Map<number, number>();
  for (const row of rows) totals.set(row.api_player_id, (totals.get(row.api_player_id) ?? 0) + row.points);
  return totals;
}

// Alle spillerne i sesongen, de dyreste først.
export const listFantasyPlayers = cache(async (season: number): Promise<FantasyPlayerOption[]> => {
  const db = supabaseAdmin();
  const [rows, points] = await Promise.all([
    loadAll<SeasonPlayerRow>((from, to) => db
      .from("football_season_players")
      .select("api_player_id, position, price, price_change, football_players (name, photo_url, player_catalog (name, slug)), football_season_teams (club_id, competition_code, football_clubs (name))")
      .eq("api_season", season)
      .order("price", { ascending: false })
      .order("api_player_id")
      .range(from, to)),
    seasonPoints(db, season),
  ]);
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
      ...fantasyPhoto(row.api_player_id, catalog?.slug, row.football_players.photo_url),
    };
  });
});

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
    const started = new Date(fixture.kickoff_at).getTime() <= now;
    const state: FixtureView["state"] = CANCELLED_STATUSES.includes(fixture.status) ? "cancelled"
      : !started ? "upcoming"
      : FINISHED_STATUSES.includes(fixture.status) && new Date(fixture.kickoff_at).getTime() + 115 * 60_000 <= now ? "finished"
      : LIVE_STATUSES.includes(fixture.status) || FINISHED_STATUSES.includes(fixture.status) ? "live" : "upcoming";
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
