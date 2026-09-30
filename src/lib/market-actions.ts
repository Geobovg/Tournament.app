"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "./actions";
import { requireUser } from "./auth";
import { dbErrorMessage, getT } from "@/i18n/server";
import { supabaseAdmin } from "./supabase/server";

function refreshMarket() { revalidatePath("/managerkarriere"); }
export async function createMarketListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const cardId = String(formData.get("card_id") ?? ""); const start = Number(formData.get("start_price")); const buyNow = Number(formData.get("buy_now_price")); const hours = Number(formData.get("duration_hours"));
  if (!cardId || !Number.isInteger(start) || !Number.isInteger(buyNow) || !Number.isInteger(hours)) return { error: (await getT()).market.errors.invalidPrices };
  const { error } = await supabaseAdmin().rpc("create_market_listing", { target_seller: user.id, target_card: cardId, next_start_price: start, next_buy_now_price: buyNow, duration_hours: hours });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) }; refreshMarket(); return { ok: true };
}
export async function placeMarketBidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const listingId = String(formData.get("listing_id") ?? ""); const amount = Number(formData.get("amount"));
  if (!listingId || !Number.isInteger(amount)) return { error: (await getT()).market.errors.invalidBid };
  const { error } = await supabaseAdmin().rpc("place_market_bid", { target_bidder: user.id, target_listing: listingId, next_amount: amount });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) }; refreshMarket(); return { ok: true };
}
export async function buyNowMarketAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser(); const listingId = String(formData.get("listing_id") ?? ""); if (!listingId) return { error: (await getT()).market.errors.listingNotFound };
  const { error } = await supabaseAdmin().rpc("buy_now_market_listing", { target_buyer: user.id, target_listing: listingId });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) }; refreshMarket(); return { ok: true };
}
