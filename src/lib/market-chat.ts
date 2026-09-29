import "server-only";

import { supabaseAdmin } from "./supabase/server";

export type MarketChatMessage = { id: string; author_id: string; author_name: string; author_avatar: string | null; body: string; created_at: string; mentions_me: boolean };
export type MarketChatUnread = { count: number; mentioned: boolean };

export const marketChatShown = 50;
const keepDays = 7;

function oldestKept() {
  return new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString();
}

/** De siste meldingene i markedschatten, eldste først. Med markRead regnes alt som vises som lest. */
export async function listMarketChat(userId: string, markRead: boolean): Promise<MarketChatMessage[]> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("market_chat_messages").select("id, author_id, body, mentions, created_at, profiles!market_chat_messages_author_id_fkey(username, avatar_url)").gt("created_at", oldestKept()).order("created_at", { ascending: false }).limit(marketChatShown);
  if (error) throw new Error(error.message);
  const messages = (data ?? []).reverse().map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { id: row.id, author_id: row.author_id, author_name: profile?.username ?? "Manager", author_avatar: profile?.avatar_url ?? null, body: row.body, created_at: row.created_at, mentions_me: (row.mentions ?? []).includes(userId) };
  });
  if (markRead) {
    // Tidspunktet til den nyeste viste meldingen, ikke nå: en melding som kommer mens vi henter, skal fortsatt telle som ulest.
    const latest = messages.at(-1)?.created_at ?? new Date().toISOString();
    const { error: readError } = await db.from("market_chat_reads").upsert({ user_id: userId, last_read_at: latest });
    if (readError) throw new Error(readError.message);
  }
  return messages;
}

/** Meldinger fra andre siden sist chatten var åpen, og om noen av dem nevner deg. */
export async function getMarketChatUnread(userId: string): Promise<MarketChatUnread> {
  const db = supabaseAdmin();
  const { data: read, error } = await db.from("market_chat_reads").select("last_read_at").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  const since = read?.last_read_at && read.last_read_at > oldestKept() ? read.last_read_at : oldestKept();
  const unread = () => db.from("market_chat_messages").select("id", { count: "exact", head: true }).gt("created_at", since).neq("author_id", userId);
  const [all, mentioned] = await Promise.all([unread(), unread().contains("mentions", [userId])]);
  if (all.error) throw new Error(all.error.message);
  if (mentioned.error) throw new Error(mentioned.error.message);
  return { count: all.count ?? 0, mentioned: (mentioned.count ?? 0) > 0 };
}
