"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import type { FivePerson } from "@/lib/femmer/data";
import { claimFiveLoginAction, claimFiveObjectiveAction, type FivePackState } from "@/lib/femmer/actions";
import type { FiveObjectiveStatus } from "@/lib/femmer/objectives";
import { FIVE_LOGIN_PACK_CARDS, fiveLoginRewards } from "@/lib/femmer/rules";
import { buttonClass, cardClass } from "../ui";
import { PackReveal } from "./five-packs";

const initial: FivePackState = {};

/** Viser kortene man fikk som premie, hvis premien hadde kort. */
function useReveal(state: FivePackState) {
  const [dismissed, setDismissed] = useState<number | undefined>();
  const open = (state.pulls?.length ?? 0) > 0 && dismissed !== state.openedAt;
  return { open, close: () => setDismissed(state.openedAt) };
}

/** Innloggingsbonusen: sju dager i rekka, der dag 7 er en pakke. Hopper man over en dag, starter det på nytt. */
export function FiveLoginBonus({ streak, claimedToday, people, coins }: { streak: number; claimedToday: boolean; people: FivePerson[]; coins: number }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(claimFiveLoginAction, initial);
  const reveal = useReveal(state);
  const claimed = claimedToday || Boolean(state.ok);
  const currentStreak = state.streak ?? streak;
  // Dagen man står på i rekka: den man har hentet i dag, ellers den neste.
  const day = claimed ? ((currentStreak - 1) % 7) + 1 : (currentStreak % 7) + 1;
  return <section className={`${cardClass} grid gap-3`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="font-black">{t.login.title}</h3><p className="text-sm text-muted">{t.login.text}</p></div>
      <form action={action}><button type="submit" disabled={pending || claimed} className={buttonClass}>{claimed ? t.login.claimed : t.login.claim}</button></form>
    </div>
    <div className="grid grid-cols-7 gap-1">{fiveLoginRewards.map((reward, index) => <div key={index} className={`grid place-items-center rounded-lg border p-1.5 text-center text-[10px] font-black sm:text-xs ${index + 1 < day || (claimed && index + 1 === day) ? "border-lime-300/50 bg-lime-300/20" : index + 1 === day ? "border-amber-300 bg-amber-300/15" : "border-white/10 bg-white/5"}`}>
      <span className="text-white/50">{t.login.day(index + 1)}</span><span>{reward ? reward : t.packs.cards(FIVE_LOGIN_PACK_CARDS)}</span>
    </div>)}</div>
    {state.ok && state.coins ? <p className="text-sm font-bold text-amber-300">{t.match.reward(state.coins)}</p> : null}
    {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
    {reveal.open ? <PackReveal key={state.openedAt} pulls={state.pulls!} people={people} coins={coins} onClose={reveal.close} /> : null}
  </section>;
}

function ObjectiveRow({ objective, people, coins }: { objective: FiveObjectiveStatus; people: FivePerson[]; coins: number }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(claimFiveObjectiveAction, initial);
  const reveal = useReveal(state);
  const done = objective.progress >= objective.target;
  const claimed = objective.claimed || Boolean(state.ok);
  const rewards = [objective.coins ? t.coinsValue(objective.coins) : null, objective.packCards ? t.objectives.pack(objective.packCards) : null, objective.inform ? t.objectives.inform : null].filter(Boolean).join(" + ");
  // Kortvisningen ligger utenfor skjemaet, siden posisjonsvalget i den er et eget skjema.
  return <><form action={action} className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
    <input type="hidden" name="objective" value={objective.key} />
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="font-black">{t.objectives.text[objective.metric](objective.target)}</p><p className="text-xs text-amber-300">{rewards}</p></div>
      <button type="submit" disabled={pending || !done || claimed} className={buttonClass}>{claimed ? t.objectives.claimed : t.objectives.claim}</button>
    </div>
    <div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className={`h-full ${done ? "bg-lime-300" : "bg-amber-300"}`} style={{ width: `${(objective.progress / objective.target) * 100}%` }} /></div><span className="text-xs font-bold tabular-nums">{objective.progress}/{objective.target}</span></div>
    {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}
  </form>
  {reveal.open ? <PackReveal key={state.openedAt} pulls={state.pulls!} people={people} coins={coins} title={t.objectives.rewardTitle} onClose={reveal.close} /> : null}</>;
}

export function FiveObjectives({ objectives, people, coins }: { objectives: FiveObjectiveStatus[]; people: FivePerson[]; coins: number }) {
  const t = useT().femmer;
  return <div className="grid gap-4 lg:grid-cols-2">
    {(["daily", "weekly"] as const).map((period) => <section key={period} className={`${cardClass} grid content-start gap-3`}>
      <div><h3 className="font-black">{t.objectives[period]}</h3><p className="text-xs text-muted">{t.objectives.resets[period]}</p></div>
      {objectives.filter((objective) => objective.period === period).map((objective) => <ObjectiveRow key={objective.key} objective={objective} people={people} coins={coins} />)}
    </section>)}
  </div>;
}
