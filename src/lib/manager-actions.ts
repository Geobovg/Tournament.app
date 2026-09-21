"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "./actions";
import { requireUser } from "./auth";
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

export async function saveManagerLineupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const formation = String(formData.get("formation") ?? "4-3-3");
  const starters = formData.getAll("starter_ids").map(String).filter(Boolean);
  const bench = formData.getAll("bench_ids").map(String).filter(Boolean);
  const { error } = await supabaseAdmin().rpc("save_manager_lineup", { target_user: user.id, next_formation: formation, next_starters: starters, next_bench: bench });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };
  revalidatePath("/managerkarriere");
  return { ok: true };
}
