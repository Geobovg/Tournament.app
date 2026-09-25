import "server-only";

import { supabaseAdmin } from "./supabase/server";

export type CareerProfile = { user_id: string; manager_budget: number; manager_budget_earned: number; club_name: string; tournament_wins: number; tournament_draws: number; tournament_losses: number; manager_career_wins: number; manager_career_draws: number; manager_career_losses: number; club_xp: number };

export async function getCareerProfile(userId: string): Promise<CareerProfile> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("player_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as CareerProfile;
  const { data: created, error: createError } = await db.from("player_profiles").insert({ user_id: userId }).select("*").single();
  if (createError) throw new Error(createError.message);
  return created as CareerProfile;
}

export async function listCareerRewards(userId: string) {
  const { data, error } = await supabaseAdmin().from("career_reward_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCareerChallenges(userId: string) {
  const { data, error } = await supabaseAdmin().from("career_challenges").select("*").eq("mode", "manager").or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`).in("status", ["pending", "accepted", "in_progress"]).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type CareerChallenge = { id: string; challenger_id: string; opponent_id: string; mode: "manager"; status: string; expires_at: string; match_id: string | null; opponent_name: string };
export async function getCareerChallenges(userId: string): Promise<CareerChallenge[]> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("career_challenges").select("id, challenger_id, opponent_id, mode, status, expires_at, career_matches(id)").eq("mode", "manager").or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`).in("status", ["pending", "accepted", "in_progress"]).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  // Utløpte utfordringer blir stående som «pending» i databasen, så de filtreres bort her for å unngå spøkelsesutfordringer.
  const now = Date.now();
  const rows = (data ?? []).filter((row) => row.status !== "pending" || new Date(row.expires_at).getTime() > now);
  const ids = [...new Set(rows.map((row) => row.challenger_id === userId ? row.opponent_id : row.challenger_id))];
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, username").in("id", ids) : { data: [] as { id: string; username: string }[] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  return rows.map((row) => { const game = Array.isArray(row.career_matches) ? row.career_matches[0] : row.career_matches; const otherId = row.challenger_id === userId ? row.opponent_id : row.challenger_id; return { id: row.id, challenger_id: row.challenger_id, opponent_id: row.opponent_id, mode: row.mode, status: row.status, expires_at: row.expires_at, match_id: game?.id ?? null, opponent_name: names.get(otherId) ?? "Venn" }; }) as CareerChallenge[];
}

export async function getCareerMatch(matchId: string, userId: string) {
  const db = supabaseAdmin();
  const { data, error } = await db.from("career_matches").select("*").eq("id", matchId).eq("mode", "manager").or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  // Kampbildet viser managernavn og klubbnavn i stedet for «Hjemme» og «Borte».
  const userIds = [data.home_user_id, data.away_user_id].filter((id): id is string => Boolean(id));
  const [{ data: profiles }, { data: careers }, { data: shots }] = await Promise.all([
    db.from("profiles").select("id, username").in("id", userIds),
    db.from("player_profiles").select("user_id, club_name").in("user_id", userIds),
    db.from("career_match_shots").select("minute, kind, side, shooter_cell, keeper_cell, outcome").eq("match_id", matchId).order("minute", { ascending: true }),
  ]);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  const clubs = new Map((careers ?? []).map((career) => [career.user_id, career.club_name]));
  const sideFor = (id: string) => ({ userId: id, username: names.get(id) ?? "Ukjent", clubName: clubs.get(id) ?? "" });
  // AI-klubben har ingen bruker. Den får samme id som i laguttaket, så den aldri blir forvekslet med deg.
  const aiSide = { userId: "ai", username: data.away_ai_name ?? "AI-klubb", clubName: "AI-motstander" };
  return {
    ...data,
    home: sideFor(data.home_user_id),
    away: data.away_user_id ? sideFor(data.away_user_id) : aiSide,
    // Klokka forankres i serverens tid, så en nettleser som går feil ikke flytter kampminuttet.
    serverNow: Date.now(),
    shots: (shots ?? []).map((shot) => ({ minute: shot.minute, kind: shot.kind, side: shot.side, shooterCell: shot.shooter_cell, keeperCell: shot.keeper_cell, outcome: shot.outcome })),
  };
}

export type ManagerCard = { id: string; catalog_id: string | null; name: string; position: string; overall: number; tradable: boolean; is_starter: boolean; acquired_price: number; location: "squad" | "storage"; slug: string | null; accent: string; club: string; attributes: Record<string, number> };
export type CatalogCard = { id: string; slug: string; name: string; position: string; overall: number; price: number; accent: string; club: string; attributes: Record<string, number> };
export type ManagerLineup = { formation: string; starters: string[]; bench: string[]; updated_at: string };
export type ManagerPack = { key: string; name: string; description: string; price: number; card_count: number; guarantee_min: number; guarantee_count: number; guarantees: { min: number; count: number }[]; odds: { min: number; max: number; weight: number }[]; accent: string };

export async function getManagerCareer(userId: string): Promise<{ cards: ManagerCard[]; catalog: CatalogCard[]; lineup: ManagerLineup | null; packs: ManagerPack[]; listedCardIds: string[]; freePacks: Record<string, number> }> {
  const db = supabaseAdmin();
  const [{ data: cards, error: cardsError }, { data: catalog, error: catalogError }, { data: lineup, error: lineupError }, { data: packs, error: packsError }, { data: listings, error: listingsError }, { data: inventory, error: inventoryError }] = await Promise.all([
    db.from("manager_cards").select("id, catalog_id, name, position, overall, tradable, is_starter, acquired_price, attributes, location, player_catalog(slug, accent, club)").eq("owner_id", userId).order("overall", { ascending: false }),
    db.from("player_catalog").select("id, slug, name, position, overall, price, accent, club, attributes").eq("active", true).order("overall", { ascending: false }),
    db.from("manager_lineups").select("formation, starters, bench, updated_at").eq("user_id", userId).maybeSingle(),
    db.from("manager_packs").select("key, name, description, price, card_count, guarantee_min, guarantee_count, guarantees, odds, accent").eq("active", true).order("sort_order", { ascending: true }),
    db.from("market_listings").select("card_id").eq("seller_id", userId).eq("status", "active"),
    db.from("manager_pack_inventory").select("pack_key, quantity").eq("user_id", userId).gt("quantity", 0),
  ]);
  if (cardsError || catalogError || lineupError || packsError || listingsError || inventoryError) throw new Error(cardsError?.message ?? catalogError?.message ?? lineupError?.message ?? packsError?.message ?? listingsError?.message ?? inventoryError?.message);
  // Academy-kort er laget for hånd og mangler katalograd, så kortbildet faller tilbake på nøytrale verdier.
  const owned = (cards ?? []).map((row) => {
    const source = Array.isArray(row.player_catalog) ? row.player_catalog[0] : row.player_catalog;
    return { ...row, player_catalog: undefined, slug: source?.slug ?? null, accent: source?.accent ?? "#35d06a", club: source?.club ?? "Akademiet" };
  });
  return { cards: owned as unknown as ManagerCard[], catalog: (catalog ?? []) as CatalogCard[], lineup: lineup as ManagerLineup | null, packs: (packs ?? []) as ManagerPack[], listedCardIds: (listings ?? []).map((row) => row.card_id), freePacks: Object.fromEntries((inventory ?? []).map((row) => [row.pack_key, row.quantity])) };
}

export type MarketListing = { id: string; seller_id: string; card_id: string; starting_price: number; buy_now_price: number; ends_at: string; card: { name: string; position: string; overall: number; club: string }; seller_name: string; highest_bid: number | null };
// Overgangsmarkedet er åpent for alle brukere, også egne annonser vises (de kan ikke kjøpes av selgeren).
export async function listTransferMarket(): Promise<MarketListing[]> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("market_listings").select("id, seller_id, card_id, starting_price, buy_now_price, ends_at, manager_cards(name, position, overall, player_catalog(club)), profiles!market_listings_seller_id_fkey(username), market_bids(amount)").eq("status", "active").gt("ends_at", new Date().toISOString()).order("ends_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const card = Array.isArray(row.manager_cards) ? row.manager_cards[0] : row.manager_cards;
    const catalog = card ? (Array.isArray(card.player_catalog) ? card.player_catalog[0] : card.player_catalog) : null;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const bids = (row.market_bids ?? []) as { amount: number }[];
    return { id: row.id, seller_id: row.seller_id, card_id: row.card_id, starting_price: row.starting_price, buy_now_price: row.buy_now_price, ends_at: row.ends_at, card: { name: card?.name ?? "Ukjent", position: card?.position ?? "", overall: card?.overall ?? 0, club: catalog?.club ?? "" }, seller_name: profile?.username ?? "Manager", highest_bid: bids.length ? Math.max(...bids.map((bid) => bid.amount)) : null };
  }) as MarketListing[];
}

export type ManagerMatchHistory = { id: string; opponentName: string; result: "win" | "draw" | "loss"; myScore: number; opponentScore: number; managerBudget: number; completedAt: string | null };
export async function listManagerMatchHistory(userId: string): Promise<ManagerMatchHistory[]> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("career_matches").select("id, home_user_id, away_user_id, away_ai_name, home_score, away_score, completed_at").eq("mode", "manager").eq("status", "completed").or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`).order("completed_at", { ascending: false }).limit(8);
  if (error) throw new Error(error.message);
  const matches = data ?? [];
  const opponentIds = [...new Set(matches.map((match) => match.home_user_id === userId ? match.away_user_id : match.home_user_id).filter((id): id is string => Boolean(id)))];
  const { data: profiles, error: profilesError } = opponentIds.length ? await db.from("profiles").select("id, username").in("id", opponentIds) : { data: [], error: null };
  if (profilesError) throw new Error(profilesError.message);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  return matches.map((match) => {
    const home = match.home_user_id === userId;
    const myScore = home ? match.home_score : match.away_score;
    const opponentScore = home ? match.away_score : match.home_score;
    const result = myScore === opponentScore ? "draw" : myScore > opponentScore ? "win" : "loss";
    const opponentId = home ? match.away_user_id : match.home_user_id;
    return { id: match.id, opponentName: opponentId ? names.get(opponentId) ?? "Venn" : match.away_ai_name ?? "AI-klubb", result, myScore, opponentScore, managerBudget: result === "win" ? 5 : result === "draw" ? 2 : 0, completedAt: match.completed_at };
  });
}
