import "server-only";
import { normalizeUsername } from "./auth";
import { supabaseAdmin } from "./supabase/server";

export type ProfileLike = { id: string; username: string; avatar_url: string | null };
export type Friend = { requestId: string; id: string; username: string; avatar_url: string | null };
export type PendingRequest = { id: string; user: ProfileLike };

async function profilesById(ids: string[]): Promise<Map<string, ProfileLike>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [row.id, row as ProfileLike]));
}

export async function listFriends(userId: string): Promise<Friend[]> {
  const { data, error } = await supabaseAdmin()
    .from("friend_requests")
    .select("id, requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const otherIds = rows.map((row) => (row.requester_id === userId ? row.recipient_id : row.requester_id));
  const profiles = await profilesById(otherIds);
  return rows
    .map((row) => {
      const otherId = row.requester_id === userId ? row.recipient_id : row.requester_id;
      const profile = profiles.get(otherId);
      return profile ? { requestId: row.id, id: profile.id, username: profile.username, avatar_url: profile.avatar_url } : null;
    })
    .filter((row): row is Friend => row !== null);
}

export async function listIncomingRequests(userId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabaseAdmin()
    .from("friend_requests")
    .select("id, requester_id")
    .eq("recipient_id", userId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const profiles = await profilesById(rows.map((row) => row.requester_id));
  return rows
    .map((row) => {
      const profile = profiles.get(row.requester_id);
      return profile ? { id: row.id, user: profile } : null;
    })
    .filter((row): row is PendingRequest => row !== null);
}

export async function listOutgoingRequests(userId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabaseAdmin()
    .from("friend_requests")
    .select("id, recipient_id")
    .eq("requester_id", userId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const profiles = await profilesById(rows.map((row) => row.recipient_id));
  return rows
    .map((row) => {
      const profile = profiles.get(row.recipient_id);
      return profile ? { id: row.id, user: profile } : null;
    })
    .filter((row): row is PendingRequest => row !== null);
}

export async function searchUsers(query: string, excludeUserId: string, limit = 8): Promise<ProfileLike[]> {
  const key = normalizeUsername(query);
  if (key.length < 2) return [];
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, username, avatar_url")
    .ilike("username_key", `%${key}%`)
    .neq("id", excludeUserId)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileLike[];
}

/** Returns the accepted friend_requests row id between the two users, if any. */
export async function friendshipId(userId: string, otherUserId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from("friend_requests")
    .select("id")
    .eq("status", "accepted")
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .maybeSingle();
  return data?.id ?? null;
}
