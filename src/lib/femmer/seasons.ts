import "server-only";

import { supabaseAdmin } from "../supabase/server";

/** Vennesesonger i Femmer (migrering 0076). Med 10 eller færre spilles det dobbel serie, ellers enkel. */
export type FiveSeasonMember = { userId: string; username: string; status: "invited" | "joined"; finalRank: number | null; prize: number };
export type FiveSeasonFixture = { id: string; round: number; homeUserId: string; awayUserId: string; matchId: string | null; status: "scheduled" | "live" | "played"; homeScore: number | null; awayScore: number | null };
export type FiveStandingRow = { userId: string; username: string; played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; points: number };
export type FiveSeason = { id: string; name: string; ownerId: string; ownerName: string; status: "open" | "active" | "completed"; inviteCode: string; createdAt: string; members: FiveSeasonMember[]; fixtures: FiveSeasonFixture[]; table: FiveStandingRow[] };

/** Kampoppsett med «sirkelmetoden»: alle møter alle én gang per runde, og dobbel serie bytter hjemme og borte. */
export function fiveRoundRobin(userIds: string[]): { round: number; home: string; away: string }[] {
  const players: (string | null)[] = [...userIds];
  if (players.length % 2) players.push(null);
  const rounds = players.length - 1; const half = players.length / 2;
  const fixtures: { round: number; home: string; away: string }[] = [];
  const order = [...players];
  for (let round = 0; round < rounds; round += 1) {
    for (let index = 0; index < half; index += 1) {
      const first = order[index]; const second = order[order.length - 1 - index];
      if (!first || !second) continue;
      // Veksler hjemmebanen så ingen får alle hjemmekampene.
      const flip = (round + index) % 2 === 1;
      fixtures.push({ round: round + 1, home: flip ? second : first, away: flip ? first : second });
    }
    order.splice(1, 0, order.pop()!);
  }
  if (userIds.length > 10) return fixtures;
  return [...fixtures, ...fixtures.map((fixture) => ({ round: fixture.round + rounds, home: fixture.away, away: fixture.home }))];
}

function standings(members: FiveSeasonMember[], fixtures: FiveSeasonFixture[]): FiveStandingRow[] {
  const rows = new Map(members.filter((member) => member.status === "joined").map((member) => [member.userId, { userId: member.userId, username: member.username, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]));
  for (const fixture of fixtures) {
    if (fixture.status !== "played" || fixture.homeScore === null || fixture.awayScore === null) continue;
    for (const [id, scored, conceded] of [[fixture.homeUserId, fixture.homeScore, fixture.awayScore], [fixture.awayUserId, fixture.awayScore, fixture.homeScore]] as const) {
      const row = rows.get(id); if (!row) continue;
      row.played += 1; row.goalsFor += scored; row.goalsAgainst += conceded;
      if (scored > conceded) { row.wins += 1; row.points += 3; } else if (scored === conceded) { row.draws += 1; row.points += 1; } else row.losses += 1;
    }
  }
  return [...rows.values()].sort((first, second) => second.points - first.points || (second.goalsFor - second.goalsAgainst) - (first.goalsFor - first.goalsAgainst) || second.goalsFor - first.goalsFor || first.username.localeCompare(second.username));
}

async function loadSeasons(seasonIds: string[]): Promise<FiveSeason[]> {
  if (!seasonIds.length) return [];
  const db = supabaseAdmin();
  const [{ data: seasons, error }, { data: members, error: membersError }, { data: fixtures, error: fixturesError }] = await Promise.all([
    db.from("five_seasons").select("*").in("id", seasonIds).order("created_at", { ascending: false }),
    db.from("five_season_members").select("season_id, user_id, status, final_rank, prize").in("season_id", seasonIds),
    db.from("five_season_fixtures").select("id, season_id, round, home_user_id, away_user_id, match_id, status, five_matches(home_score, away_score)").in("season_id", seasonIds).order("round"),
  ]);
  if (error || membersError || fixturesError) throw new Error(error?.message ?? membersError?.message ?? fixturesError?.message);
  const ids = [...new Set([...(members ?? []).map((member) => member.user_id), ...(seasons ?? []).map((season) => season.owner_id)])];
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, username").in("id", ids) : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.username as string]));
  return (seasons ?? []).map((season) => {
    const seasonMembers: FiveSeasonMember[] = (members ?? []).filter((member) => member.season_id === season.id).map((member) => ({ userId: member.user_id, username: names.get(member.user_id) ?? "?", status: member.status, finalRank: member.final_rank, prize: member.prize }));
    const seasonFixtures: FiveSeasonFixture[] = (fixtures ?? []).filter((fixture) => fixture.season_id === season.id).map((fixture) => {
      const match = Array.isArray(fixture.five_matches) ? fixture.five_matches[0] : fixture.five_matches;
      return { id: fixture.id, round: fixture.round, homeUserId: fixture.home_user_id, awayUserId: fixture.away_user_id, matchId: fixture.match_id, status: fixture.status, homeScore: fixture.status === "played" ? match?.home_score ?? null : null, awayScore: fixture.status === "played" ? match?.away_score ?? null : null };
    });
    return { id: season.id, name: season.name, ownerId: season.owner_id, ownerName: names.get(season.owner_id) ?? "?", status: season.status, inviteCode: season.invite_code, createdAt: season.created_at, members: seasonMembers, fixtures: seasonFixtures, table: standings(seasonMembers, seasonFixtures) };
  });
}

/** Sesongene brukeren er med i eller invitert til. */
export async function listFiveSeasons(userId: string): Promise<FiveSeason[]> {
  const { data, error } = await supabaseAdmin().from("five_season_members").select("season_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return loadSeasons((data ?? []).map((row) => row.season_id));
}

export async function getFiveSeason(seasonId: string): Promise<FiveSeason | null> {
  return (await loadSeasons([seasonId]))[0] ?? null;
}

export async function getFiveSeasonByCode(code: string): Promise<FiveSeason | null> {
  const { data, error } = await supabaseAdmin().from("five_seasons").select("id").eq("invite_code", code.toUpperCase()).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? getFiveSeason(data.id) : null;
}
