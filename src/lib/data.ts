import "server-only";
import { supabaseAdmin } from "./supabase/server";
import type {
  GoalClip,
  Match,
  Team,
  Tournament,
  Vote,
} from "./tournament/types";

export async function listTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabaseAdmin()
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Tournament[];
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const { data, error } = await supabaseAdmin()
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Tournament) ?? null;
}

export async function listTeams(tournamentId: string): Promise<Team[]> {
  const { data, error } = await supabaseAdmin()
    .from("teams")
    .select("id, tournament_id, name, created_at")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Team[];
}

export async function listMatches(tournamentId: string): Promise<Match[]> {
  const { data, error } = await supabaseAdmin()
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: true })
    .order("tie_position", { ascending: true })
    .order("leg_number", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Match[];
}

export async function getMatch(id: string): Promise<Match | null> {
  const { data, error } = await supabaseAdmin()
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Match) ?? null;
}

export async function listGoalClips(matchIds: string[]): Promise<GoalClip[]> {
  if (matchIds.length === 0) return [];
  const { data, error } = await supabaseAdmin()
    .from("goal_clips")
    .select("*")
    .in("match_id", matchIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as GoalClip[];
}

export async function listVotes(tournamentId: string): Promise<Vote[]> {
  const { data, error } = await supabaseAdmin()
    .from("votes")
    .select("*")
    .eq("tournament_id", tournamentId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Vote[];
}
