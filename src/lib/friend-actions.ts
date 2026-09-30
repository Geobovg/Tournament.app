"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, getT } from "@/i18n/server";
import { requireUser } from "./auth";
import type { ActionState } from "./actions";
import { isTournamentOwner } from "./data";
import { friendshipId, searchUsers, type ProfileLike } from "./friends";
import { supabaseAdmin } from "./supabase/server";

export type SearchState = { query: string; results: ProfileLike[] };

export async function searchUsersAction(_prev: SearchState, formData: FormData): Promise<SearchState> {
  const user = await requireUser();
  const query = String(formData.get("query") ?? "").trim();
  if (query.length < 2) return { query, results: [] };
  const results = await searchUsers(query, user.id);
  return { query, results };
}

export async function sendFriendRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const recipientId = String(formData.get("recipient_id") ?? "");
  const t = (await getT()).friends.errors;
  if (!recipientId) return { error: t.missingRecipient };
  if (recipientId === user.id) return { error: t.cannotAddSelf };

  const { data: recipient } = await supabaseAdmin().from("profiles").select("id").eq("id", recipientId).maybeSingle();
  if (!recipient) return { error: t.userNotFound };

  const { data: existing } = await supabaseAdmin()
    .from("friend_requests")
    .select("id, status")
    .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`)
    .maybeSingle();

  if (existing?.status === "accepted") return { error: t.alreadyFriends };
  if (existing?.status === "pending") return { error: t.requestExists };

  const { error } = existing
    ? await supabaseAdmin()
        .from("friend_requests")
        .update({ requester_id: user.id, recipient_id: recipientId, status: "pending", responded_at: null })
        .eq("id", existing.id)
    : await supabaseAdmin().from("friend_requests").insert({ requester_id: user.id, recipient_id: recipientId });
  if (error) return { error: await dbErrorMessage(error) };

  revalidatePath("/venner");
  return { ok: true };
}

export async function acceptFriendRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const requestId = String(formData.get("request_id") ?? "");
  const t = (await getT()).friends.errors;
  const { data: request } = await supabaseAdmin().from("friend_requests").select("id, recipient_id, status").eq("id", requestId).maybeSingle();
  if (!request || request.recipient_id !== user.id || request.status !== "pending") return { error: t.requestNotFound };

  const { error } = await supabaseAdmin()
    .from("friend_requests")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return { error: await dbErrorMessage(error) };

  revalidatePath("/venner");
  return { ok: true };
}

/** Declines an incoming request, cancels an outgoing request, or removes an existing friendship — the row's owner is always one of the two users. */
export async function removeFriendRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const requestId = String(formData.get("request_id") ?? "");
  const t = (await getT()).friends.errors;
  const { data: request } = await supabaseAdmin().from("friend_requests").select("id, requester_id, recipient_id").eq("id", requestId).maybeSingle();
  if (!request || (request.requester_id !== user.id && request.recipient_id !== user.id)) return { error: t.requestNotFound };

  const { error } = await supabaseAdmin().from("friend_requests").delete().eq("id", requestId);
  if (error) return { error: await dbErrorMessage(error) };

  revalidatePath("/venner");
  return { ok: true };
}

export async function addFriendToTournamentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const friendId = String(formData.get("friend_id") ?? "");
  const t = (await getT()).friends.errors;

  if (!(await isTournamentOwner(tournamentId, user.id))) return { error: t.ownerOnly };

  const { data: tournament } = await supabaseAdmin().from("tournaments").select("status").eq("id", tournamentId).maybeSingle();
  if (!tournament || tournament.status !== "registration") return { error: t.registrationClosed };

  if (!(await friendshipId(user.id, friendId))) return { error: t.notFriends };

  const { error } = await supabaseAdmin()
    .from("tournament_members")
    .upsert({ tournament_id: tournamentId, user_id: friendId }, { onConflict: "tournament_id,user_id", ignoreDuplicates: true });
  if (error) return { error: await dbErrorMessage(error) };

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/turneringer");
  return { ok: true };
}
