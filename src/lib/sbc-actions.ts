"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage } from "@/i18n/server";
import { requireUser } from "./auth";
import { supabaseAdmin } from "./supabase/server";

export type SbcResult = { error?: string; rewardMb?: number; rewardPack?: string | null };

/** Leverer kortene. Databasen sjekker eierskap, krav og ukegrense og gir premien i samme transaksjon. */
export async function completeSbcAction(sbcKey: string, cardIds: string[]): Promise<SbcResult> {
  const user = await requireUser();
  const ids = Array.isArray(cardIds) ? cardIds.map(String).slice(0, 11) : [];
  const { data, error } = await supabaseAdmin().rpc("complete_sbc", { target_user: user.id, target_sbc: String(sbcKey), target_cards: ids });
  if (error) return { error: await dbErrorMessage(error, { stripPrefix: true }) };
  revalidatePath("/managerkarriere");
  return { rewardMb: data.reward_mb, rewardPack: data.reward_pack };
}
