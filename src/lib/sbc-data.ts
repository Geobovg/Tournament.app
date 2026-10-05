import "server-only";

import { supabaseAdmin } from "./supabase/server";
import type { SbcCard, SbcChallenge, SbcRequirement } from "./sbc";

export type SbcData = { challenges: SbcChallenge[]; cards: SbcCard[]; nextReset: string; nextDailyReset: string };

/**
 * SBC-ene, forsøkene i dag og denne uken, og kortene brukeren faktisk kan levere (ikke Academy, ikke i
 * startelleveren, ikke på markedet). Benk, reserver og kort som ikke kan selges på markedet kan brukes.
 */
export async function getSbcData(userId: string): Promise<SbcData> {
  const db = supabaseAdmin();
  const [{ data: bounds, error: boundsError }, { data: day, error: dayError }] = await Promise.all([db.rpc("sbc_week_bounds"), db.rpc("sbc_day_bounds")]);
  if (boundsError || dayError) throw new Error(boundsError?.message ?? dayError?.message);
  const [{ data: challenges, error: challengesError }, { data: completions, error: completionsError }, { data: cards, error: cardsError }, { data: lineup, error: lineupError }, { data: listings, error: listingsError }] = await Promise.all([
    db.from("sbc_challenges").select("key, card_count, requirements, reward_mb, reward_pack, attempt_limit, limit_period").eq("active", true).order("sort_order", { ascending: true }),
    db.from("sbc_completions").select("sbc_key, completed_at").eq("user_id", userId).gte("completed_at", bounds.week_start),
    db.from("manager_cards").select("id, name, position, overall, catalog_id, player_catalog(slug, accent, club, league, nation, price), special_cards(kind, price), personal_cards(card_id)").eq("owner_id", userId).eq("is_starter", false).order("overall", { ascending: true }),
    db.from("manager_lineups").select("starters, bench").eq("user_id", userId).maybeSingle(),
    db.from("market_listings").select("card_id").eq("seller_id", userId).eq("status", "active"),
  ]);
  const failure = challengesError ?? completionsError ?? cardsError ?? lineupError ?? listingsError;
  if (failure) throw new Error(failure.message);

  // Forsøkene telles fra starten av perioden SBC-en har grense for: i dag (fra kl. 18) eller denne uken.
  const dayStart = new Date(day.day_start).getTime();
  const usedThisWeek = new Map<string, number>(); const usedToday = new Map<string, number>();
  for (const row of completions ?? []) {
    usedThisWeek.set(row.sbc_key, (usedThisWeek.get(row.sbc_key) ?? 0) + 1);
    if (new Date(row.completed_at).getTime() >= dayStart) usedToday.set(row.sbc_key, (usedToday.get(row.sbc_key) ?? 0) + 1);
  }
  const bench = new Set<string>(lineup?.bench ?? []);
  const busy = new Set<string>([...(lineup?.starters ?? []), ...(listings ?? []).map((row) => row.card_id)]);

  return {
    nextReset: bounds.next_reset, nextDailyReset: day.next_reset,
    challenges: (challenges ?? []).map((row) => ({ key: row.key, cardCount: row.card_count, requirements: row.requirements as SbcRequirement[], rewardMb: row.reward_mb, rewardPack: row.reward_pack, attemptLimit: row.attempt_limit, limitPeriod: row.limit_period, used: (row.limit_period === "day" ? usedToday : usedThisWeek).get(row.key) ?? 0 })),
    // Personlige kort kan aldri leveres inn (migrering 0063).
    cards: (cards ?? []).filter((card) => !busy.has(card.id) && !(Array.isArray(card.personal_cards) ? card.personal_cards.length : card.personal_cards)).map((card) => {
      const catalog = Array.isArray(card.player_catalog) ? card.player_catalog[0] : card.player_catalog;
      const special = Array.isArray(card.special_cards) ? card.special_cards[0] : card.special_cards;
      return { id: card.id, name: card.name, position: card.position, overall: card.overall, slug: catalog?.slug ?? null, accent: catalog?.accent ?? "#7a8794", club: catalog?.club ?? "", league: catalog?.league ?? "other", nation: catalog?.nation ?? null, value: special?.price ?? catalog?.price ?? 0, onBench: bench.has(card.id), special: special?.kind ?? null };
    }),
  };
}
