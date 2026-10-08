"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/lib/actions";
import { joinFiveSeasonAction } from "@/lib/femmer/actions";
import { buttonClass } from "../ui";

const initial: ActionState = {};

export function FiveJoinByCode({ code }: { code: string }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(joinFiveSeasonAction, initial);
  return <form action={action} className="grid gap-2">
    <input type="hidden" name="code" value={code} />
    <button type="submit" disabled={pending} className={buttonClass}>{t.seasons.join}</button>
    {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
  </form>;
}
