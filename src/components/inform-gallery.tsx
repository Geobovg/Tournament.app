"use client";

import { useLocale, useT } from "@/i18n/client";
import { INTL_LOCALES } from "@/i18n/locales";
import type { InformRound } from "@/lib/career";
import { specialStyles } from "@/lib/special-cards";
import { PlayerCardFace } from "./player-card-face";

/** Alle inform-kortene som er laget, én seksjon per fredagsrunde med den nyeste øverst. */
export function InformGallery({ rounds }: { rounds: InformRound[] }) {
  const t = useT(); const ti = t.career.informs; const locale = useLocale();
  const total = rounds.reduce((sum, round) => sum + round.cards.length, 0);
  const date = (value: string) => { try { return new Intl.DateTimeFormat(INTL_LOCALES[locale], { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)); } catch { return value.slice(0, 10); } };
  return <div className="grid gap-5">
    <div className="rounded-xl border-2 p-4 text-white" style={{ background: specialStyles.inform.background, borderColor: specialStyles.inform.border }}>
      <p className="text-xs font-black tracking-[.3em]" style={{ color: specialStyles.inform.badge }}>★ {t.career.special.badge.inform}</p>
      <p className="mt-1 text-sm text-white/75">{ti.intro(total, rounds.length)}</p>
    </div>
    {rounds.length ? rounds.map((round) => <section key={round.id} className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2">
        <h2 className="text-lg font-black" suppressHydrationWarning>{round.current ? ti.thisWeek : ti.week(date(round.startsAt))}</h2>
        <p className="text-xs text-white/55">{ti.count(round.cards.length)}</p>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
        {round.cards.map((card) => <li key={card.id}><PlayerCardFace player={card} className="h-full" footer={<p className="text-center text-xs font-black tracking-widest" style={{ color: specialStyles.inform.badge }}>{ti.boost(card.boost)}</p>} /></li>)}
      </ul>
    </section>) : <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">{ti.empty}</p>}
  </div>;
}
