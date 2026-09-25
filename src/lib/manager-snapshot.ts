import "server-only";

import type { ManagerPlayerSnapshot, ManagerTeamSnapshot } from "./manager-match";
import type { supabaseAdmin } from "./supabase/server";

function uniqueIds(value: unknown) { return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : []; }

/** Laguttakene slik de står nå. Managere uten gyldig ellever er ikke med i svaret. */
export async function managerTeamSnapshots(db: ReturnType<typeof supabaseAdmin>, userIds: string[]): Promise<Map<string, ManagerTeamSnapshot> | { error: string }> {
  const { data: lineups, error: lineupsError } = await db.from("manager_lineups").select("user_id, formation, starters, bench").in("user_id", userIds);
  if (lineupsError) return { error: lineupsError.message };
  const allIds = (lineups ?? []).flatMap((lineup) => [...uniqueIds(lineup.starters), ...uniqueIds(lineup.bench)]);
  // Katalogdataene blir med i laguttaket slik at kampbildet kan tegne spillerkortene uten flere oppslag.
  const { data: cards, error: cardsError } = allIds.length ? await db.from("manager_cards").select("id, owner_id, name, position, overall, player_catalog(slug, club, accent)").in("id", allIds) : { data: [], error: null };
  if (cardsError) return { error: cardsError.message };
  const snapshots = new Map<string, ManagerTeamSnapshot>();
  for (const lineup of lineups ?? []) {
    const starters = uniqueIds(lineup.starters); const bench = uniqueIds(lineup.bench);
    if (starters.length !== 11 || bench.length > 7 || starters.some((id) => bench.includes(id))) continue;
    const owned = new Map<string, ManagerPlayerSnapshot>();
    for (const card of (cards ?? []).filter((card) => card.owner_id === lineup.user_id)) {
      const catalog = Array.isArray(card.player_catalog) ? card.player_catalog[0] : card.player_catalog;
      owned.set(card.id, { id: card.id, name: card.name, position: card.position, overall: card.overall, slug: catalog?.slug ?? null, club: catalog?.club ?? null, accent: catalog?.accent ?? null });
    }
    const selectedStarters = starters.map((id) => owned.get(id)).filter((card): card is ManagerPlayerSnapshot => Boolean(card));
    const selectedBench = bench.map((id) => owned.get(id)).filter((card): card is ManagerPlayerSnapshot => Boolean(card));
    if (selectedStarters.length === 11 && selectedBench.length === bench.length) snapshots.set(lineup.user_id, { userId: lineup.user_id, formation: lineup.formation, starters: selectedStarters, bench: selectedBench });
  }
  return snapshots;
}
