import "server-only";

import { supabaseAdmin } from "./supabase/server";
import type { SbcCard, SbcChallenge, SbcRequirement } from "./sbc";

export type SbcData = { challenges: SbcChallenge[]; cards: SbcCard[]; nextReset: string };

/** SBC-ene, ukens forsøk og kortene brukeren faktisk kan levere (ikke Academy, ikke i laget, ikke på markedet). */
export async function getSbcData(userId: string): Promise<SbcData> {
  const db = supabaseAdmin();
  const { data: bounds, error: boundsError } = await db.rpc("sbc_week_bounds");
  if (boundsError) throw new Error(boundsError.message);
  const [{ data: challenges, error: challengesError }, { data: completions, error: completionsError }, { data: cards, error: cardsError }, { data: lineup, error: lineupError }, { data: listings, error: listingsError }] = await Promise.all([
    db.from("sbc_challenges").select("key, card_count, requirements, reward_mb, reward_pack, weekly_limit").eq("active", true).order("sort_order", { ascending: true }),
    db.from("sbc_completions").select("sbc_key").eq("user_id", userId).gte("completed_at", bounds.week_start),
    db.from("manager_cards").select("id, name, position, overall, catalog_id, player_catalog(slug, accent, club, league, nation, price)").eq("owner_id", userId).eq("tradable", true).eq("is_starter", false).order("overall", { ascending: true }),
    db.from("manager_lineups").select("starters, bench").eq("user_id", userId).maybeSingle(),
    db.from("market_listings").select("card_id").eq("seller_id", userId).eq("status", "active"),
  ]);
  const failure = challengesError ?? completionsError ?? cardsError ?? lineupError ?? listingsError;
  if (failure) throw new Error(failure.message);

  const used = new Map<string, number>();
  for (const row of completions ?? []) used.set(row.sbc_key, (used.get(row.sbc_key) ?? 0) + 1);
  const busy = new Set<string>([...(lineup?.starters ?? []), ...(lineup?.bench ?? []), ...(listings ?? []).map((row) => row.card_id)]);

  return {
    nextReset: bounds.next_reset,
    challenges: (challenges ?? []).map((row) => ({ key: row.key, cardCount: row.card_count, requirements: row.requirements as SbcRequirement[], rewardMb: row.reward_mb, rewardPack: row.reward_pack, weeklyLimit: row.weekly_limit, usedThisWeek: used.get(row.key) ?? 0 })),
    cards: (cards ?? []).filter((card) => !busy.has(card.id)).map((card) => {
      const catalog = Array.isArray(card.player_catalog) ? card.player_catalog[0] : card.player_catalog;
      return { id: card.id, name: card.name, position: card.position, overall: card.overall, slug: catalog?.slug ?? null, accent: catalog?.accent ?? "#7a8794", club: catalog?.club ?? "", league: catalog?.league ?? "other", nation: catalog?.nation ?? null, value: catalog?.price ?? 0 };
    }),
  };
}
