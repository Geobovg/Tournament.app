import "server-only";

import { listFriends } from "../friends";
import { supabaseAdmin } from "../supabase/server";
import { isFiveMatchData, teamRating, type FiveMatchData } from "./match";
import { isFiveFormation, type FiveFormation } from "./rules";

/** En person som har et personlig kort, altså et kort som kan brukes i Femmer. */
export type FivePerson = { personId: string; name: string; slug: string; username: string };
/** Et kort brukeren eier i Femmer. */
export type FiveCard = FivePerson & { id: string; overall: number; xp: number; goals: number; assists: number; appearances: number };
export type FiveProfile = { coins: number; aiLevel: number; bestAiLevel: number; wins: number; draws: number; losses: number; formation: FiveFormation; freePackAvailable: boolean };
export type FiveState = { profile: FiveProfile; cards: FiveCard[]; starters: string[]; bench: string[]; rating: number | null };

function osloToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" }).format(new Date());
}

/** Alle personlige kort, sortert på navn. Navnet på kortet ligger på kortet i managerkarrieren. */
export async function listFivePeople(): Promise<FivePerson[]> {
  const { data, error } = await supabaseAdmin().from("personal_cards").select("user_id, slug, manager_cards(name), profiles(username)");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const card = Array.isArray(row.manager_cards) ? row.manager_cards[0] : row.manager_cards;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { personId: row.user_id, slug: row.slug, name: card?.name ?? profile?.username ?? "?", username: profile?.username ?? "" };
  }).sort((first, second) => first.name.localeCompare(second.name, "nb-NO"));
}

/** Hele Femmer-tilstanden til en bruker, eller null hvis brukeren ikke har startet ennå. */
export async function getFiveState(userId: string, people?: FivePerson[]): Promise<FiveState | null> {
  const db = supabaseAdmin();
  const [{ data: profile, error: profileError }, { data: cards, error: cardsError }, { data: lineup, error: lineupError }, everyone] = await Promise.all([
    db.from("five_profiles").select("*").eq("user_id", userId).maybeSingle(),
    db.from("five_cards").select("id, person_id, overall, xp, goals, assists, appearances").eq("owner_id", userId),
    db.from("five_lineups").select("starters, bench").eq("user_id", userId).maybeSingle(),
    people ? Promise.resolve(people) : listFivePeople(),
  ]);
  if (profileError || cardsError || lineupError) throw new Error(profileError?.message ?? cardsError?.message ?? lineupError?.message);
  if (!profile) return null;
  const byPerson = new Map(everyone.map((person) => [person.personId, person]));
  const owned: FiveCard[] = (cards ?? []).flatMap((card) => {
    const person = byPerson.get(card.person_id);
    return person ? [{ ...person, id: card.id, overall: card.overall, xp: card.xp, goals: card.goals, assists: card.assists, appearances: card.appearances }] : [];
  }).sort((first, second) => second.overall - first.overall || first.name.localeCompare(second.name, "nb-NO"));
  const ids = new Set(owned.map((card) => card.id));
  const starters = ((lineup?.starters ?? []) as string[]).filter((id) => ids.has(id));
  const bench = ((lineup?.bench ?? []) as string[]).filter((id) => ids.has(id));
  const starterCards = starters.map((id) => owned.find((card) => card.id === id)!).filter(Boolean);
  return {
    profile: {
      coins: profile.coins, aiLevel: profile.ai_level, bestAiLevel: profile.best_ai_level, wins: profile.wins, draws: profile.draws, losses: profile.losses,
      formation: isFiveFormation(profile.formation) ? profile.formation : "1-2-1",
      freePackAvailable: profile.last_free_pack_on !== osloToday(),
    },
    cards: owned, starters, bench,
    rating: starterCards.length === 5 ? teamRating(starterCards) : null,
  };
}

export type FiveOpponent = { id: string; username: string; rating: number | null };

/** Vennene som har startet Femmer og har en gyldig startfemmer, så man kan spille mot dem. */
export async function listFiveOpponents(userId: string): Promise<FiveOpponent[]> {
  const friends = await listFriends(userId);
  if (!friends.length) return [];
  const db = supabaseAdmin();
  const { data: lineups, error } = await db.from("five_lineups").select("user_id, starters").in("user_id", friends.map((friend) => friend.id));
  if (error) throw new Error(error.message);
  const starterIds = (lineups ?? []).flatMap((lineup) => lineup.starters as string[]);
  const { data: cards, error: cardsError } = starterIds.length ? await db.from("five_cards").select("id, overall").in("id", starterIds) : { data: [], error: null };
  if (cardsError) throw new Error(cardsError.message);
  const overall = new Map((cards ?? []).map((card) => [card.id, card.overall]));
  const ratings = new Map((lineups ?? []).map((lineup) => {
    const players = (lineup.starters as string[]).map((id) => overall.get(id)).filter((value): value is number => value !== undefined);
    return [lineup.user_id, players.length === 5 ? teamRating(players.map((value) => ({ overall: value }))) : null];
  }));
  return friends.filter((friend) => ratings.has(friend.id)).map((friend) => ({ id: friend.id, username: friend.username, rating: ratings.get(friend.id) ?? null }));
}

export type FiveMatchRow = { id: string; kind: "ai" | "friend"; homeUserId: string; awayUserId: string | null; awayName: string; homeScore: number; awayScore: number; coins: number; aiLevel: number | null; createdAt: string; data: FiveMatchData | null; homeName: string };

async function usernames(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data } = await supabaseAdmin().from("profiles").select("id, username").in("id", ids);
  return new Map((data ?? []).map((row) => [row.id, row.username as string]));
}

/** De siste kampene brukeren har vært med i, både de man startet og de venner startet mot en. */
export async function listFiveMatches(userId: string, limit = 20): Promise<FiveMatchRow[]> {
  const { data, error } = await supabaseAdmin().from("five_matches").select("id, kind, home_user_id, away_user_id, away_name, home_score, away_score, coins, ai_level, created_at").or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const names = await usernames([...new Set((data ?? []).map((row) => row.home_user_id))]);
  return (data ?? []).map((row) => ({ id: row.id, kind: row.kind, homeUserId: row.home_user_id, awayUserId: row.away_user_id, awayName: row.away_name, homeScore: row.home_score, awayScore: row.away_score, coins: row.coins, aiLevel: row.ai_level, createdAt: row.created_at, data: null, homeName: names.get(row.home_user_id) ?? "" }));
}

export async function getFiveMatch(matchId: string, userId: string): Promise<FiveMatchRow | null> {
  const { data, error } = await supabaseAdmin().from("five_matches").select("*").eq("id", matchId).or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const names = await usernames([data.home_user_id]);
  return { id: data.id, kind: data.kind, homeUserId: data.home_user_id, awayUserId: data.away_user_id, awayName: data.away_name, homeScore: data.home_score, awayScore: data.away_score, coins: data.coins, aiLevel: data.ai_level, createdAt: data.created_at, data: isFiveMatchData(data.events) ? data.events : null, homeName: names.get(data.home_user_id) ?? "" };
}
