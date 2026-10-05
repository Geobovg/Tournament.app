import "server-only";

import type { Dictionary } from "@/i18n/dictionaries";
import { getT } from "@/i18n/server";
import type { AiTeam } from "./ai-opponent";
import { supabaseAdmin } from "./supabase/server";

export type SeasonTableRow = { participant: string; name: string; isMe: boolean; played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; points: number; position: number };
export type SeasonFixture = { id: string; round: number; homeName: string; awayName: string; homeIsMe: boolean; awayIsMe: boolean; status: "scheduled" | "live" | "completed"; homeScore: number | null; awayScore: number | null; matchId: string | null; playoff: boolean };
export type SeasonOutcome = "promoted" | "relegated" | "stayed" | "champion";
/** `highestArena` er den høyeste arenaen manageren har nådd, `championTitles` antall mestertitler på Camp Nou. */
export type AiSeason = { id: string; seasonNumber: number; arena: number; division: number; teams: AiTeam[]; table: SeasonTableRow[]; fixtures: SeasonFixture[]; nextFixture: SeasonFixture | null; played: number; inPlayoff: boolean; previous: { arena: number; division: number; position: number; outcome: SeasonOutcome } | null; highestArena: number; championTitles: number };
export type FriendSeasonMember = { userId: string; username: string; status: "invited" | "joined" };
export type FriendSeason = { id: string; name: string; status: "open" | "active" | "completed"; isOwner: boolean; myStatus: "invited" | "joined"; members: FriendSeasonMember[]; table: SeasonTableRow[]; fixtures: SeasonFixture[]; nextFixture: SeasonFixture | null };

type FixtureRow = { id: string; round: number; home_user_id: string | null; away_user_id: string | null; home_ai_key: string | null; away_ai_key: string | null; status: SeasonFixture["status"]; home_score: number | null; away_score: number | null; match_id: string | null; stage?: "league" | "playoff" };
type StandingRow = { participant: string; played: number; wins: number; draws: number; losses: number; goals_for: number; goals_against: number; points: number; table_position: number };

export const divisionName = (t: Dictionary, division: number) => t.seasons.division(division);

function toTable(rows: StandingRow[], names: Map<string, string>, userId: string, unknown: string): SeasonTableRow[] {
  return rows.map((row) => ({ participant: row.participant, name: names.get(row.participant) ?? unknown, isMe: row.participant === userId, played: row.played, wins: row.wins, draws: row.draws, losses: row.losses, goalsFor: row.goals_for, goalsAgainst: row.goals_against, points: row.points, position: row.table_position })).sort((a, b) => a.position - b.position);
}

function toFixture(row: FixtureRow, names: Map<string, string>, userId: string, unknown: string): SeasonFixture {
  const home = row.home_user_id ?? row.home_ai_key ?? ""; const away = row.away_user_id ?? row.away_ai_key ?? "";
  return { id: row.id, round: row.round, homeName: names.get(home) ?? unknown, awayName: names.get(away) ?? unknown, homeIsMe: home === userId, awayIsMe: away === userId, status: row.status, homeScore: row.home_score, awayScore: row.away_score, matchId: row.match_id, playoff: row.stage === "playoff" };
}

/** Den neste kampen som venter på deg: en som allerede er i gang, ellers den første uspilte. */
function nextFor(fixtures: SeasonFixture[]) {
  const mine = fixtures.filter((fixture) => fixture.homeIsMe || fixture.awayIsMe);
  return mine.find((fixture) => fixture.status === "live") ?? mine.find((fixture) => fixture.status === "scheduled") ?? null;
}

async function usernames(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data, error } = await supabaseAdmin().from("profiles").select("id, username").in("id", ids);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((profile) => [profile.id, profile.username]));
}

/** Brukerens aktive AI-sesong. Finnes den ikke, startes en ny med én gang. */
// Klubbnavnet kan komme som et løfte, så sesongen kan hentes samtidig med profilen.
export async function getAiSeason(userId: string, clubName: string | Promise<string>): Promise<AiSeason> {
  const db = supabaseAdmin();
  const fallback = (await getT()).seasons.fallback;
  const { data: seasonId, error: ensureError } = await db.rpc("ensure_ai_season", { target_user: userId });
  if (ensureError) throw new Error(ensureError.message);
  const [{ data: season, error: seasonError }, { data: fixtures, error: fixturesError }, { data: standings, error: standingsError }, { data: previous }, { data: highest }, { count: championTitles }] = await Promise.all([
    db.from("career_ai_seasons").select("id, season_number, arena, division, teams").eq("id", seasonId).single(),
    db.from("career_season_matches").select("id, round, stage, home_user_id, away_user_id, home_ai_key, away_ai_key, status, home_score, away_score, match_id").eq("ai_season_id", seasonId).order("round", { ascending: true }),
    db.rpc("season_standings", { target_ai_season: seasonId, target_friend_season: null }),
    db.from("career_ai_seasons").select("arena, division, final_position, outcome").eq("user_id", userId).eq("status", "completed").order("season_number", { ascending: false }).limit(1).maybeSingle(),
    db.from("career_ai_seasons").select("arena").eq("user_id", userId).order("arena", { ascending: false }).limit(1).maybeSingle(),
    db.from("career_ai_seasons").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("outcome", "champion"),
  ]);
  if (seasonError || fixturesError || standingsError) throw new Error(seasonError?.message ?? fixturesError?.message ?? standingsError?.message);
  const teams = (season.teams ?? []) as AiTeam[];
  const names = new Map<string, string>([[userId, (await clubName) || fallback.yourClub], ...teams.map((team) => [team.key, team.name] as [string, string])]);
  const all = ((fixtures ?? []) as FixtureRow[]).map((row) => toFixture(row, names, userId, fallback.unknown));
  const mine = all.filter((fixture) => fixture.homeIsMe || fixture.awayIsMe);
  const nextFixture = nextFor(mine);
  return {
    id: season.id, seasonNumber: season.season_number, arena: season.arena ?? 1, division: season.division, teams,
    table: toTable((standings ?? []) as StandingRow[], names, userId, fallback.unknown),
    fixtures: mine, nextFixture, played: mine.filter((fixture) => !fixture.playoff && fixture.status === "completed").length, inPlayoff: nextFixture?.playoff ?? false,
    previous: previous?.outcome ? { arena: previous.arena ?? 1, division: previous.division, position: previous.final_position, outcome: previous.outcome } : null,
    highestArena: highest?.arena ?? season.arena ?? 1, championTitles: championTitles ?? 0,
  };
}

/** Vennesesongene du er med i eller invitert til. Avsluttede sesonger vises bare de tre siste. */
export async function getFriendSeasons(userId: string): Promise<FriendSeason[]> {
  const db = supabaseAdmin();
  const fallback = (await getT()).seasons.fallback;
  const { data: memberships, error } = await db.from("career_friend_season_members").select("season_id, status").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const ids = (memberships ?? []).map((row) => row.season_id);
  if (!ids.length) return [];
  const [{ data: seasons, error: seasonsError }, { data: members, error: membersError }, { data: fixtures, error: fixturesError }] = await Promise.all([
    db.from("career_friend_seasons").select("id, name, status, created_by, created_at").in("id", ids).order("created_at", { ascending: false }),
    db.from("career_friend_season_members").select("season_id, user_id, status").in("season_id", ids),
    db.from("career_season_matches").select("id, friend_season_id, round, home_user_id, away_user_id, home_ai_key, away_ai_key, status, home_score, away_score, match_id").in("friend_season_id", ids).order("round", { ascending: true }),
  ]);
  if (seasonsError || membersError || fixturesError) throw new Error(seasonsError?.message ?? membersError?.message ?? fixturesError?.message);
  const names = await usernames([...new Set((members ?? []).map((member) => member.user_id))]);
  const recentCompleted = new Set((seasons ?? []).filter((season) => season.status === "completed").slice(0, 3).map((season) => season.id));
  const visible = (seasons ?? []).filter((season) => season.status !== "completed" || recentCompleted.has(season.id));
  return Promise.all(visible.map(async (season) => {
    const seasonFixtures = ((fixtures ?? []) as (FixtureRow & { friend_season_id: string })[]).filter((row) => row.friend_season_id === season.id).map((row) => toFixture(row, names, userId, fallback.unknown));
    const { data: standings } = season.status === "open" ? { data: [] } : await db.rpc("season_standings", { target_ai_season: null, target_friend_season: season.id });
    const mine = seasonFixtures.filter((fixture) => fixture.homeIsMe || fixture.awayIsMe);
    return {
      id: season.id, name: season.name, status: season.status, isOwner: season.created_by === userId,
      myStatus: (memberships ?? []).find((row) => row.season_id === season.id)?.status ?? "invited",
      members: (members ?? []).filter((member) => member.season_id === season.id).map((member) => ({ userId: member.user_id, username: names.get(member.user_id) ?? fallback.friend, status: member.status })),
      table: toTable((standings ?? []) as StandingRow[], names, userId, fallback.unknown),
      fixtures: seasonFixtures, nextFixture: nextFor(mine),
    } as FriendSeason;
  }));
}
