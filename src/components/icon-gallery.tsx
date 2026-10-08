"use client";

import { useT } from "@/i18n/client";
import type { InformCard } from "@/lib/career";
import { specialStyles } from "@/lib/special-cards";
import { PlayerCardFace } from "./player-card-face";

/** Alle Icon-kortene (migrering 0074), sortert etter rating. */
export function IconGallery({ cards }: { cards: InformCard[] }) {
  const t = useT(); const ti = t.career.icons; const style = specialStyles.icon;
  return <div className="grid gap-5">
    <div className="rounded-xl border-2 p-4 text-white" style={{ background: style.background, borderColor: style.border }}>
      <p className="text-xs font-black tracking-[.3em]" style={{ color: style.badge }}>★ {t.career.special.name.icon}</p>
      <p className="mt-1 text-sm text-white/80">{ti.intro(cards.length)}</p>
    </div>
    {cards.length ? <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
      {cards.map((card) => <li key={card.id}><PlayerCardFace player={card} className="h-full" /></li>)}
    </ul> : <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">{ti.empty}</p>}
  </div>;
}
