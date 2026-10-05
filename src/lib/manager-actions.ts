"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage, getT } from "@/i18n/server";
import type { ActionState } from "./actions";
import { requireUser } from "./auth";
import { getCatalogPage, listCatalogClubs, type CatalogCard } from "./career";
import type { CatalogFilters } from "./catalog-filters";
import { canPlayPosition, formationNames, formations, pickBestSquad, type Formation } from "./lineup";
import { squadCapacity } from "./manager-limits";
import type { SpecialKind } from "./special-cards";
import { supabaseAdmin } from "./supabase/server";

export async function buyCatalogCardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const catalogId = String(formData.get("catalog_id") ?? "");
  if (!catalogId) return { error: (await getT()).career.errors.missingPlayerCard };
  const { error } = await supabaseAdmin().rpc("buy_catalog_card", { target_user: user.id, target_catalog: catalogId });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/managerkarriere");
  return { ok: true };
}

// Katalogen i nettleseren henter én side med kort om gangen herfra når filteret endres eller man trykker «Vis flere».
export async function loadCatalogPageAction(filters: CatalogFilters, offset: number): Promise<{ cards: CatalogCard[]; total: number }> {
  await requireUser();
  const sort = filters.sort === "price-asc" || filters.sort === "price-desc" ? filters.sort : "overall";
  const maximumPrice = filters.maximumPrice === null || !Number.isFinite(Number(filters.maximumPrice)) ? null : Number(filters.maximumPrice);
  return getCatalogPage({ search: String(filters.search ?? "").slice(0, 60), position: String(filters.position ?? "all"), minimum: Number(filters.minimum) || 0, maximumPrice, clubs: (Array.isArray(filters.clubs) ? filters.clubs : []).map(String).slice(0, 100), sort }, Math.max(0, Math.floor(Number(offset) || 0)));
}

export async function loadCatalogClubsAction(): Promise<string[]> {
  await requireUser();
  return listCatalogClubs();
}

export type PackPull = { card_id: string; catalog_id: string; slug: string; name: string; position: string; overall: number; price: number; accent: string; club: string; attributes: Record<string, number>; location: "squad" | "storage"; duplicate: boolean; special: SpecialKind | null; tradable: boolean };
export type PackActionState = ActionState & { pulls?: PackPull[]; openedAt?: number; packKey?: string };

export async function openManagerPackAction(_prev: PackActionState, formData: FormData): Promise<PackActionState> {
  const user = await requireUser();
  const packKey = String(formData.get("pack_key") ?? "");
  if (!packKey) return { error: (await getT()).career.errors.choosePack };
  // Gratispakker fra klubbnivå åpnes med samme regler, men trekker ikke managerbudsjett.
  const free = formData.get("free") === "1";
  const { data, error } = await supabaseAdmin().rpc(free ? "open_free_manager_pack" : "open_manager_pack", { target_user: user.id, target_pack: packKey });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/managerkarriere");
  // openedAt skiller to like trekk fra hverandre, slik at animasjonen starter på nytt.
  return { ok: true, pulls: (data ?? []) as PackPull[], openedAt: Date.now(), packKey };
}

export async function moveManagerCardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const cardId = String(formData.get("card_id") ?? "");
  const location = String(formData.get("location") ?? "");
  if (!cardId || (location !== "squad" && location !== "storage")) return { error: (await getT()).career.errors.invalidMove };
  const { error } = await supabaseAdmin().rpc("move_manager_card", { target_user: user.id, target_card: cardId, next_location: location });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/managerkarriere");
  return { ok: true };
}

export async function swapManagerCardsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const squadCard = String(formData.get("squad_card") ?? "");
  const storageCard = String(formData.get("storage_card") ?? "");
  if (!squadCard || !storageCard) return { error: (await getT()).career.errors.pickSwapCards };
  const { error } = await supabaseAdmin().rpc("swap_manager_cards", { target_user: user.id, squad_card: squadCard, storage_card: storageCard });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/managerkarriere");
  return { ok: true };
}

export type QuickSellState = ActionState & { payout?: number };

// Hurtigsalg gir 25 % av katalogverdien. Beløpet regnes ut i databasen og vises tilbake til spilleren.
export async function quickSellManagerCardAction(_prev: QuickSellState, formData: FormData): Promise<QuickSellState> {
  const user = await requireUser();
  const cardId = String(formData.get("card_id") ?? "");
  if (!cardId) return { error: (await getT()).career.errors.missingCard };
  const { data, error } = await supabaseAdmin().rpc("quick_sell_manager_card", { target_user: user.id, target_card: cardId });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/managerkarriere");
  return { ok: true, payout: Number(data ?? 0) };
}

// «Velg beste tropp» på troppsiden. Den plukker det beste laget fra hele
// klubben – lageret inkludert – henter kortene inn i troppen og lagrer
// elleveren i samme slengen. Kortene som må vike, går motsatt vei til lageret.
export async function autoPickBestSquadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const formation = String(formData.get("formation") ?? "4-3-3") as Formation;
  if (!formationNames.includes(formation)) return { error: (await getT()).career.errors.invalidFormation };
  const db = supabaseAdmin();
  const [{ data: cards, error: cardsError }, { data: listings, error: listingsError }] = await Promise.all([
    db.from("manager_cards").select("id, catalog_id, position, overall, location").eq("owner_id", user.id),
    db.from("market_listings").select("card_id").eq("seller_id", user.id).eq("status", "active"),
  ]);
  if (cardsError || listingsError) return { error: await dbErrorMessage((cardsError ?? listingsError)!) };
  // Kort som ligger ute på markedet, kan ikke spilles.
  const listed = new Set((listings ?? []).map((listing) => listing.card_id));
  // Bare ett kort per spiller kan være i troppen. Har man flere (f.eks. vanlig-kortet og informen),
  // velges det beste, og ved lik rating det som allerede ligger der.
  const oneCopyEach = new Map<string, NonNullable<typeof cards>[number]>();
  const candidates = (cards ?? []).filter((card) => !listed.has(card.id));
  for (const card of candidates.sort((a, b) => b.overall - a.overall || Number(b.location === "squad") - Number(a.location === "squad"))) {
    const key = card.catalog_id ?? card.id;
    if (!oneCopyEach.has(key)) oneCopyEach.set(key, card);
  }
  const best = pickBestSquad([...oneCopyEach.values()], formation, squadCapacity);
  if (best.starters.length !== 11 || best.bench.length !== 7) return { error: (await getT()).career.errors.notEnoughCards };
  const { error } = await db.rpc("auto_pick_manager_squad", { target_user: user.id, next_formation: formation, next_squad: best.squad, next_starters: best.starters, next_bench: best.bench });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/managerkarriere");
  return { ok: true };
}

export async function saveManagerLineupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const formation = String(formData.get("formation") ?? "4-3-3") as Formation;
  const starters = formData.getAll("starter_ids").map(String).filter(Boolean);
  const bench = formData.getAll("bench_ids").map(String).filter(Boolean);
  const errors = (await getT()).career.errors;
  if (!formationNames.includes(formation)) return { error: errors.invalidFormation };
  if (starters.length !== 11 || bench.length !== 7) return { error: errors.exactLineup };
  const ids = [...starters, ...bench];
  if (new Set(ids).size !== ids.length) return { error: errors.duplicatePick };
  const db = supabaseAdmin();
  const { data: ownedCards, error: cardsError } = await db.from("manager_cards").select("id, position, location").eq("owner_id", user.id).in("id", ids);
  if (cardsError) return { error: await dbErrorMessage(cardsError) };
  if (ownedCards?.length !== ids.length || ownedCards.some((card) => card.location !== "squad")) return { error: errors.unusableCard };
  const positions = new Map((ownedCards ?? []).map((card) => [card.id, card.position]));
  if (starters.some((id, index) => !canPlayPosition(positions.get(id) ?? "", formations[formation][index].position))) return { error: errors.wrongPosition };
  const { error } = await db.rpc("save_manager_lineup", { target_user: user.id, next_formation: formation, next_starters: starters, next_bench: bench });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/managerkarriere");
  return { ok: true };
}
