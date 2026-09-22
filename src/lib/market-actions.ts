"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "./actions";
import { requireUser } from "./auth";
import { supabaseAdmin } from "./supabase/server";

function refreshMarket() { revalidatePath("/managerkarriere"); }
export async function createMarketListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const cardId = String(formData.get("card_id") ?? ""); const start = Number(formData.get("start_price")); const buyNow = Number(formData.get("buy_now_price")); const hours = Number(formData.get("duration_hours"));
  if (!cardId || !Number.isInteger(start) || !Number.isInteger(buyNow) || !Number.isInteger(hours)) return { error: "Fyll inn gyldige priser" };
  const { error } = await supabaseAdmin().rpc("create_market_listing", { target_seller: user.id, target_card: cardId, next_start_price: start, next_buy_now_price: buyNow, duration_hours: hours });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") }; refreshMarket(); return { ok: true };
}
export async function placeMarketBidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const listingId = String(formData.get("listing_id") ?? ""); const amount = Number(formData.get("amount"));
  if (!listingId || !Number.isInteger(amount)) return { error: "Skriv inn et gyldig bud" };
  const { error } = await supabaseAdmin().rpc("place_market_bid", { target_bidder: user.id, target_listing: listingId, next_amount: amount });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") }; refreshMarket(); return { ok: true };
}
export async function buyNowMarketAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const listingId = String(formData.get("listing_id") ?? ""); if (!listingId) return { error: "Fant ikke annonsen" };
  const { error } = await supabaseAdmin().rpc("buy_now_market_listing", { target_buyer: user.id, target_listing: listingId });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") }; refreshMarket(); return { ok: true };
}
export async function sendDirectTransferOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const cardId = String(formData.get("card_id") ?? ""); const buyerId = String(formData.get("buyer_id") ?? ""); const price = Number(formData.get("price"));
  if (!cardId || !buyerId || !Number.isInteger(price)) return { error: "Velg venn og gyldig pris" };
  const { error } = await supabaseAdmin().rpc("create_direct_transfer_offer", { target_seller: user.id, target_buyer: buyerId, target_card: cardId, next_price: price });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") }; refreshMarket(); return { ok: true };
}
export async function respondDirectTransferOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const offerId = String(formData.get("offer_id") ?? ""); const response = String(formData.get("response") ?? "");
  if (!offerId || (response !== "accept" && response !== "decline")) return { error: "Ugyldig tilbudssvar" };
  const { error } = await supabaseAdmin().rpc("respond_direct_transfer_offer", { target_actor: user.id, target_offer: offerId, response });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") }; refreshMarket(); return { ok: true };
}
export async function counterDirectTransferOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const offerId = String(formData.get("offer_id") ?? ""); const price = Number(formData.get("price"));
  if (!offerId || !Number.isInteger(price)) return { error: "Skriv inn en gyldig motpris" };
  const { error } = await supabaseAdmin().rpc("counter_direct_transfer_offer", { target_actor: user.id, target_offer: offerId, next_price: price });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") }; refreshMarket(); return { ok: true };
}
