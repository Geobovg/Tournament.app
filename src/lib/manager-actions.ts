"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "./actions";
import { requireUser } from "./auth";
import { canPlayPosition, formationNames, formations, type Formation } from "./lineup";
import { supabaseAdmin } from "./supabase/server";

export async function buyCatalogCardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const catalogId = String(formData.get("catalog_id") ?? "");
  if (!catalogId) return { error: "Mangler spillerkort" };
  const { error } = await supabaseAdmin().rpc("buy_catalog_card", { target_user: user.id, target_catalog: catalogId });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };
  revalidatePath("/managerkarriere");
  return { ok: true };
}

export type PackPull = { card_id: string; catalog_id: string; slug: string; name: string; position: string; overall: number; price: number; accent: string; club: string; attributes: Record<string, number>; location: "squad" | "storage"; duplicate: boolean };
export type PackActionState = ActionState & { pulls?: PackPull[]; openedAt?: number; packKey?: string };

export async function openManagerPackAction(_prev: PackActionState, formData: FormData): Promise<PackActionState> {
  const user = await requireUser();
  const packKey = String(formData.get("pack_key") ?? "");
  if (!packKey) return { error: "Velg en pakke" };
  // Gratispakker fra klubbnivå åpnes med samme regler, men trekker ikke managerbudsjett.
  const free = formData.get("free") === "1";
  const { data, error } = await supabaseAdmin().rpc(free ? "open_free_manager_pack" : "open_manager_pack", { target_user: user.id, target_pack: packKey });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };
  revalidatePath("/managerkarriere");
  // openedAt skiller to like trekk fra hverandre, slik at animasjonen starter på nytt.
  return { ok: true, pulls: (data ?? []) as PackPull[], openedAt: Date.now(), packKey };
}

export async function moveManagerCardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const cardId = String(formData.get("card_id") ?? "");
  const location = String(formData.get("location") ?? "");
  if (!cardId || (location !== "squad" && location !== "storage")) return { error: "Ugyldig flytting" };
  const { error } = await supabaseAdmin().rpc("move_manager_card", { target_user: user.id, target_card: cardId, next_location: location });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };
  revalidatePath("/managerkarriere");
  return { ok: true };
}

export async function swapManagerCardsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const squadCard = String(formData.get("squad_card") ?? "");
  const storageCard = String(formData.get("storage_card") ?? "");
  if (!squadCard || !storageCard) return { error: "Velg ett kort fra troppen og ett fra lageret" };
  const { error } = await supabaseAdmin().rpc("swap_manager_cards", { target_user: user.id, squad_card: squadCard, storage_card: storageCard });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };
  revalidatePath("/managerkarriere");
  return { ok: true };
}

export async function quickSellManagerCardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const cardId = String(formData.get("card_id") ?? "");
  if (!cardId) return { error: "Mangler kort" };
  const { error } = await supabaseAdmin().rpc("quick_sell_manager_card", { target_user: user.id, target_card: cardId });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };
  revalidatePath("/managerkarriere");
  return { ok: true };
}

export async function saveManagerLineupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const formation = String(formData.get("formation") ?? "4-3-3") as Formation;
  const starters = formData.getAll("starter_ids").map(String).filter(Boolean);
  const bench = formData.getAll("bench_ids").map(String).filter(Boolean);
  if (!formationNames.includes(formation)) return { error: "Ugyldig formasjon" };
  if (starters.length !== 11 || bench.length !== 7) return { error: "Du må velge nøyaktig 11 startspillere og 7 på benken" };
  const ids = [...starters, ...bench];
  if (new Set(ids).size !== ids.length) return { error: "En spiller kan bare velges én gang" };
  const db = supabaseAdmin();
  const { data: ownedCards, error: cardsError } = await db.from("manager_cards").select("id, position, location").eq("owner_id", user.id).in("id", ids);
  if (cardsError) return { error: cardsError.message };
  if (ownedCards?.length !== ids.length || ownedCards.some((card) => card.location !== "squad")) return { error: "Troppen inneholder et kort du ikke kan bruke" };
  const positions = new Map((ownedCards ?? []).map((card) => [card.id, card.position]));
  if (starters.some((id, index) => !canPlayPosition(positions.get(id) ?? "", formations[formation][index].position))) return { error: "En spiller står i en posisjon han ikke kan spille" };
  const { error } = await db.rpc("save_manager_lineup", { target_user: user.id, next_formation: formation, next_starters: starters, next_bench: bench });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };
  revalidatePath("/managerkarriere");
  return { ok: true };
}
