"use server";

import type { ActionState } from "./actions";
import { normalizeUsername, requireUser, sessionUserId } from "./auth";
import { getMarketChatUnread, listMarketChat, type MarketChatMessage, type MarketChatUnread } from "./market-chat";
import { mentionCandidates } from "./market-chat-mentions";
import { supabaseAdmin } from "./supabase/server";

// Hentes hvert 3. sekund mens chatten er åpen. markRead er bare sann når chatten faktisk vises.
export async function loadMarketChatAction(markRead: boolean): Promise<MarketChatMessage[]> {
  const userId = await sessionUserId();
  if (!userId) return [];
  return listMarketChat(userId, markRead);
}

export async function marketChatUnreadAction(): Promise<MarketChatUnread> {
  const userId = await sessionUserId();
  if (!userId) return { count: 0, mentioned: false };
  return getMarketChatUnread(userId);
}

export async function sendMarketChatAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Skriv en melding først" };
  if (body.length > 300) return { error: "Meldingen kan være maks 300 tegn" };
  const db = supabaseAdmin();
  const names = mentionCandidates(body).map(normalizeUsername);
  let mentions: string[] = [];
  if (names.length) {
    const { data, error } = await db.from("profiles").select("id").in("username_key", names);
    if (error) return { error: error.message };
    mentions = (data ?? []).map((row) => row.id);
  }
  const { error } = await db.rpc("post_market_chat_message", { target_author: user.id, next_body: body, next_mentions: mentions });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };
  return { ok: true };
}

export async function deleteMarketChatMessageAction(messageId: string): Promise<ActionState> {
  const user = await requireUser();
  // author_id i filteret gjør at man bare kan slette sine egne meldinger.
  const { error } = await supabaseAdmin().from("market_chat_messages").delete().eq("id", messageId).eq("author_id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Opptil 5 managere som passer det som er skrevet etter @. */
export async function suggestMentionsAction(query: string): Promise<string[]> {
  const userId = await sessionUserId();
  if (!userId || !/^[a-zA-Z0-9_.-]{1,24}$/.test(query)) return [];
  // _ er jokertegn i ilike, så det må escapes for å bety et vanlig tegn.
  const pattern = `${normalizeUsername(query).replace(/_/g, "\\_")}%`;
  const { data, error } = await supabaseAdmin().from("profiles").select("username").ilike("username_key", pattern).neq("id", userId).order("username_key").limit(5);
  if (error) return [];
  return (data ?? []).map((row) => row.username);
}
