import "server-only";

import { cache } from "react";
import { listFriends } from "../friends";
import { supabaseAdmin } from "../supabase/server";
import { isFiveMatchData, teamRating, type FiveMatchData, type FiveShotResult } from "./match";
import { isFiveFormation, isFivePosition, type FiveFormation, type FivePosition } from "./rules";

/** En person som har et personlig kort, altså et kort som kan brukes i Femmer. Nye kort dukker opp her med en gang. */
export type FivePerson = { personId: string; name: string; slug: string; username: string };
export type FiveInform = { id: string; personId: string; name: string; slug: string; overall: number; boost: number; rank: number; points: number; weekStart: string; current: boolean };
/** Et kort brukeren eier i Femmer. `informId` er satt på inform-kort. */
export type FiveCard = FivePerson & { id: string; overall: number; xp: number; goals: number; assists: number; appearances: number; position: FivePosition | null; informId: string | null };
export type FiveProfile = { coins: number; aiLevel: number; bestAiLevel: number; wins: number; draws: number; losses: number; formation: FiveFormation; freePackAvailable: boolean; loginStreak: number; loginClaimedToday: boolean };
export type FiveState = { profile: FiveProfile; cards: FiveCard[]; starters: string[]; bench: string[]; rating: number | null };

export function osloToday(at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" }).format(at);
}

/** Alle personlige kort, sortert på navn. Navnet på kortet ligger på kortet i managerkarrieren. */
export const listFivePeople = cache(async (): Promise<FivePerson[]> => {
  const { data, error } = await supabaseAdmin().from("personal_cards").select("user_id, slug, manager_cards(name), profiles(username)");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const card = Array.isArray(row.manager_cards) ? row.manager_cards[0] : row.manager_cards;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { personId: row.user_id, slug: row.slug, name: card?.name ?? profile?.username ?? "?", username: profile?.username ?? "" };
  }).sort((first, second) => first.name.localeCompare(second.name, "nb-NO"));
});

/** Ukens runde lages første gang noen trenger den (fredag kl. 18). Svarer med starten på uka. */
export const ensureFiveInformRound = cache(async (): Promise<string> => {
  const { data, error } = await supabaseAdmin().rpc("ensure_five_inform_round");
  if (error) throw new Error(error.message);
  return String(data);
});

/** Alle inform-kortene som er laget, nyeste først. */
export const listFiveInforms = cache(async (): Promise<FiveInform[]> => {
  const [weekStart, people] = await Promise.all([ensureFiveInformRound(), listFivePeople()]);
  const { data, error } = await supabaseAdmin().from("five_informs").select("id, person_id, overall, boost, rank, points, week_start").order("week_start", { ascending: false }).order("rank", { ascending: true });
  if (error) throw new Error(error.message);
  const byPerson = new Map(people.map((person) => [person.personId, person]));
  const current = new Date(weekStart).getTime();
  return (data ?? []).flatMap((row) => {
    const person = byPerson.get(row.person_id);
    return person ? [{ id: row.id, personId: row.person_id, name: person.name, slug: person.slug, overall: row.overall, boost: row.boost, rank: row.rank, points: row.points, weekStart: row.week_start, current: new Date(row.week_start).getTime() === current }] : [];
  });
});

/** Hele Femmer-tilstanden til en bruker, eller null hvis brukeren ikke har startet ennå. */
export async function getFiveState(userId: string): Promise<FiveState | null> {
  const db = supabaseAdmin();
  const [{ data: profile, error: profileError }, { data: cards, error: cardsError }, { data: lineup, error: lineupError }, everyone] = await Promise.all([
    db.from("five_profiles").select("*").eq("user_id", userId).maybeSingle(),
    db.from("five_cards").select("id, person_id, inform_id, position, overall, xp, goals, assists, appearances").eq("owner_id", userId),
    db.from("five_lineups").select("starters, bench").eq("user_id", userId).maybeSingle(),
    listFivePeople(),
  ]);
  if (profileError || cardsError || lineupError) throw new Error(profileError?.message ?? cardsError?.message ?? lineupError?.message);
  if (!profile) return null;
  const byPerson = new Map(everyone.map((person) => [person.personId, person]));
  const owned: FiveCard[] = (cards ?? []).flatMap((card) => {
    const person = byPerson.get(card.person_id);
    return person ? [{ ...person, id: card.id, overall: card.overall, xp: card.xp, goals: card.goals, assists: card.assists, appearances: card.appearances, position: isFivePosition(card.position) ? card.position : null, informId: card.inform_id }] : [];
  }).sort((first, second) => second.overall - first.overall || first.name.localeCompare(second.name, "nb-NO"));
  const ids = new Set(owned.map((card) => card.id));
  const starters = ((lineup?.starters ?? []) as string[]).filter((id) => ids.has(id));
  const bench = ((lineup?.bench ?? []) as string[]).filter((id) => ids.has(id));
  const starterCards = starters.map((id) => owned.find((card) => card.id === id)).filter((card): card is FiveCard => Boolean(card));
  const today = osloToday();
  return {
    profile: {
      coins: profile.coins, aiLevel: profile.ai_level, bestAiLevel: profile.best_ai_level, wins: profile.wins, draws: profile.draws, losses: profile.losses,
      formation: isFiveFormation(profile.formation) ? profile.formation : "1-2-1",
      freePackAvailable: profile.last_free_pack_on !== today,
      loginStreak: profile.login_streak ?? 0,
      loginClaimedToday: profile.last_login_on === today,
    },
    cards: owned, starters, bench,
    rating: starterCards.length === 5 ? teamRating(starterCards) : null,
  };
}

export type FiveOpponent = { id: string; username: string; rating: number | null };

/** Lagratingen (snittet av startfemmeren) til flere managere på en gang. */
export async function fiveTeamRatings(userIds: string[]): Promise<Map<string, number | null>> {
  if (!userIds.length) return new Map();
  const db = supabaseAdmin();
  const { data: lineups, error } = await db.from("five_lineups").select("user_id, starters").in("user_id", userIds);
  if (error) throw new Error(error.message);
  const starterIds = (lineups ?? []).flatMap((lineup) => lineup.starters as string[]);
  const overall = new Map<string, number>();
  for (let offset = 0; offset < starterIds.length; offset += 300) {
    const { data: cards, error: cardsError } = await db.from("five_cards").select("id, overall").in("id", starterIds.slice(offset, offset + 300));
    if (cardsError) throw new Error(cardsError.message);
    for (const card of cards ?? []) overall.set(card.id, card.overall);
  }
  return new Map((lineups ?? []).map((lineup) => {
    const players = (lineup.starters as string[]).map((id) => overall.get(id)).filter((value): value is number => value !== undefined);
    return [lineup.user_id, players.length === 5 ? teamRating(players.map((value) => ({ overall: value }))) : null];
  }));
}

/** Vennene som har startet Femmer og har en startfemmer, så man kan spille mot dem. */
export async function listFiveOpponents(userId: string): Promise<FiveOpponent[]> {
  const friends = await listFriends(userId);
  const ratings = await fiveTeamRatings(friends.map((friend) => friend.id));
  return friends.filter((friend) => ratings.has(friend.id)).map((friend) => ({ id: friend.id, username: friend.username, rating: ratings.get(friend.id) ?? null }));
}

export type FiveMatchRow = {
  id: string; kind: "ai" | "friend" | "season"; status: "live" | "completed"; homeUserId: string; awayUserId: string | null; awayName: string; homeName: string;
  homeScore: number; awayScore: number; coins: number; awayCoins: number; aiLevel: number | null; seasonId: string | null; controllerId: string | null;
  createdAt: string; startedAt: string | null; data: FiveMatchData | null; shots: FiveShotResult[];
  /** Serverens klokke da raden ble hentet, så kampklokka i nettleseren kan forankres i den. */
  serverNow: number;
};

async function usernames(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data } = await supabaseAdmin().from("profiles").select("id, username").in("id", ids);
  return new Map((data ?? []).map((row) => [row.id, row.username as string]));
}

type MatchRecord = { id: string; kind: FiveMatchRow["kind"]; status: FiveMatchRow["status"]; home_user_id: string; away_user_id: string | null; away_name: string; home_score: number; away_score: number; coins: number; away_coins: number; ai_level: number | null; season_id: string | null; controller_id: string | null; created_at: string; started_at: string | null; events?: unknown };

function toRow(row: MatchRecord, names: Map<string, string>, shots: FiveShotResult[] = []): FiveMatchRow {
  return {
    id: row.id, kind: row.kind, status: row.status, homeUserId: row.home_user_id, awayUserId: row.away_user_id, awayName: row.away_name, homeName: names.get(row.home_user_id) ?? "",
    homeScore: row.home_score, awayScore: row.away_score, coins: row.coins, awayCoins: row.away_coins ?? 0, aiLevel: row.ai_level, seasonId: row.season_id, controllerId: row.controller_id,
    createdAt: row.created_at, startedAt: row.started_at, data: isFiveMatchData(row.events) ? row.events : null, shots, serverNow: Date.now(),
  };
}

const listColumns = "id, kind, status, home_user_id, away_user_id, away_name, home_score, away_score, coins, away_coins, ai_level, season_id, controller_id, created_at, started_at";

/** De siste ferdige kampene brukeren har vært med i, både som hjemme- og bortelag. */
export async function listFiveMatches(userId: string, limit = 20): Promise<FiveMatchRow[]> {
  const { data, error } = await supabaseAdmin().from("five_matches").select(listColumns).eq("status", "completed").or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`).order("completed_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const names = await usernames([...new Set((data ?? []).map((row) => row.home_user_id))]);
  return ((data ?? []) as MatchRecord[]).map((row) => toRow(row, names));
}

export async function getFiveShots(matchId: string): Promise<FiveShotResult[]> {
  const { data, error } = await supabaseAdmin().from("five_match_shots").select("minute, side, shooter_cell, keeper_cell, outcome").eq("match_id", matchId).order("minute");
  if (error) throw new Error(error.message);
  return (data ?? []).map((shot) => ({ minute: shot.minute, side: shot.side, shooterCell: shot.shooter_cell, keeperCell: shot.keeper_cell, outcome: shot.outcome }));
}

export async function getFiveMatch(matchId: string, userId?: string): Promise<FiveMatchRow | null> {
  let query = supabaseAdmin().from("five_matches").select("*").eq("id", matchId);
  if (userId) query = query.or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [names, shots] = await Promise.all([usernames([data.home_user_id]), getFiveShots(matchId)]);
  return toRow(data as MatchRecord, names, shots);
}

/** Kampen brukeren spiller akkurat nå, hvis noen. */
export async function getLiveFiveMatchId(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().from("five_matches").select("id").eq("controller_id", userId).eq("status", "live").maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Toppliste
// ---------------------------------------------------------------------------

export type FiveLeaderboard = {
  ladder: { userId: string; username: string; best: number; current: number }[];
  ratings: { userId: string; username: string; rating: number }[];
  scorers: { cardId: string; name: string; slug: string; owner: string; goals: number; assists: number; inform: boolean }[];
  records: { userId: string; username: string; wins: number; draws: number; losses: number }[];
};

export async function getFiveLeaderboard(): Promise<FiveLeaderboard> {
  const db = supabaseAdmin();
  const [{ data: profiles, error }, { data: scorers, error: scorersError }, people] = await Promise.all([
    db.from("five_profiles").select("user_id, ai_level, best_ai_level, wins, draws, losses").order("best_ai_level", { ascending: false }).limit(200),
    db.from("five_cards").select("id, owner_id, person_id, inform_id, goals, assists").gt("goals", 0).order("goals", { ascending: false }).order("assists", { ascending: false }).limit(15),
    listFivePeople(),
  ]);
  if (error || scorersError) throw new Error(error?.message ?? scorersError?.message);
  const userIds = [...new Set([...(profiles ?? []).map((row) => row.user_id), ...(scorers ?? []).map((row) => row.owner_id)])];
  const [names, ratings] = await Promise.all([usernames(userIds), fiveTeamRatings((profiles ?? []).map((row) => row.user_id))]);
  const byPerson = new Map(people.map((person) => [person.personId, person]));
  return {
    ladder: (profiles ?? []).map((row) => ({ userId: row.user_id, username: names.get(row.user_id) ?? "?", best: row.best_ai_level, current: row.ai_level })).sort((first, second) => second.best - first.best || second.current - first.current).slice(0, 15),
    ratings: [...ratings].flatMap(([userId, rating]) => (rating === null ? [] : [{ userId, username: names.get(userId) ?? "?", rating }])).sort((first, second) => second.rating - first.rating).slice(0, 15),
    scorers: (scorers ?? []).flatMap((row) => { const person = byPerson.get(row.person_id); return person ? [{ cardId: row.id, name: person.name, slug: person.slug, owner: names.get(row.owner_id) ?? "?", goals: row.goals, assists: row.assists, inform: Boolean(row.inform_id) }] : []; }),
    records: (profiles ?? []).filter((row) => row.wins + row.draws + row.losses > 0).map((row) => ({ userId: row.user_id, username: names.get(row.user_id) ?? "?", wins: row.wins, draws: row.draws, losses: row.losses })).sort((first, second) => (second.wins * 3 + second.draws) - (first.wins * 3 + first.draws) || second.wins - first.wins).slice(0, 15),
  };
}
