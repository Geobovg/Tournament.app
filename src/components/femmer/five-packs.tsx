"use client";

import { useActionState, useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import type { FivePerson } from "@/lib/femmer/data";
import { openFivePackAction, type FivePackState, type FivePull } from "@/lib/femmer/actions";
import { fivePacks } from "@/lib/femmer/rules";
import { buttonClass, cardClass } from "../ui";
import { FiveCardTile } from "./five-card";

const initial: FivePackState = {};
const packTones: Record<string, string> = {
  free: "from-lime-400/30 via-emerald-950 to-slate-950",
  single: "from-sky-400/30 via-sky-950 to-slate-950",
  triple: "from-fuchsia-500/35 via-fuchsia-950 to-slate-950",
  mega: "from-amber-300/40 via-amber-950 to-slate-950",
};

/** Kortene snus ett om gangen, som i en ekte pakkeåpning. Komponenten lages på nytt for hver pakke. */
function PackReveal({ pulls, people, onClose }: { pulls: FivePull[]; people: FivePerson[]; onClose: () => void }) {
  const t = useT().femmer;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setShown((current) => Math.min(pulls.length, current + 1)), 700);
    return () => clearInterval(timer);
  }, [pulls.length]);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur" role="dialog" aria-modal>
    <div className={`${cardClass} grid max-h-[90vh] w-full max-w-4xl gap-4 overflow-y-auto`}>
      <h3 className="text-center text-2xl font-black">{t.packs.pulled}</h3>
      <div className="flex flex-wrap justify-center gap-4">
        {pulls.map((pull, index) => {
          const who = people.find((entry) => entry.personId === pull.personId);
          if (index >= shown || !who) return <div key={index} className="grid h-60 w-[170px] place-items-center rounded-xl border-2 border-white/20 bg-gradient-to-br from-fuchsia-600 to-amber-400 text-5xl font-black shadow-xl sm:w-[200px]">?</div>;
          return <div key={index} className="grid justify-items-center gap-2">
            <FiveCardTile name={who.name} slug={who.slug} overall={pull.overall} size="lg" label={pull.upgrade ? t.packs.upgrade : t.packs.new} eager />
            <p className={`text-sm font-black ${pull.upgrade ? "text-amber-300" : "text-lime-300"}`}>{pull.upgrade ? t.packs.upgradeText(who.name, pull.overall) : t.packs.newText}</p>
          </div>;
        })}
      </div>
      <button type="button" disabled={shown < pulls.length} onClick={onClose} className={`${buttonClass} justify-self-center`}>{t.packs.close}</button>
    </div>
  </div>;
}

/** Pakkebutikken. */
export function FivePacks({ coins, freePackAvailable, people }: { coins: number; freePackAvailable: boolean; people: FivePerson[] }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(openFivePackAction, initial);
  const [dismissed, setDismissed] = useState<number | undefined>();
  const pulls = state.pulls ?? [];
  const open = pulls.length > 0 && dismissed !== state.openedAt;

  return <div className="grid gap-4">
    <p className="text-sm text-muted">{t.packs.rule}</p>
    {state.error ? <p className="text-red-400">{state.error}</p> : null}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {fivePacks.map((pack) => {
        const free = pack.price === 0;
        const disabled = pending || (free ? !freePackAvailable : coins < pack.price);
        return <form key={pack.key} action={action} className={`flex min-h-56 flex-col rounded-2xl border border-white/15 bg-gradient-to-br ${packTones[pack.key]} p-5`}>
          <input type="hidden" name="pack_key" value={pack.key} />
          <p className="text-xs font-black tracking-[.25em] text-white/60">{t.packs.cards(pack.cards)}</p>
          <h3 className="mt-2 text-2xl font-black">{t.packs.names[pack.key]}</h3>
          <p className="mt-1 text-lg font-black text-lime-300">{free ? t.packs.free : t.coinsValue(pack.price)}</p>
          <button type="submit" disabled={disabled} className={`${buttonClass} mt-auto bg-white text-slate-950`}>{pending ? t.packs.opening : free && !freePackAvailable ? t.packs.freeUsed : t.packs.open}</button>
        </form>;
      })}
    </div>
    {open ? <PackReveal key={state.openedAt} pulls={pulls} people={people} onClose={() => setDismissed(state.openedAt)} /> : null}
  </div>;
}
