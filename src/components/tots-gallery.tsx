"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import type { TotsCard } from "@/lib/career";
import { specialStyles } from "@/lib/special-cards";
import { PlayerCardFace } from "./player-card-face";

// De fem store ligaene får hver sin knapp, resten av verden samles i én (som i migrering 0065).
const bigLeagues = ["premier_league", "la_liga", "serie_a", "bundesliga", "ligue_1"] as const;
type LeagueFilter = "all" | typeof bigLeagues[number] | "rest";

/** Alle TOTS-kortene, med filter per liga. */
export function TotsGallery({ cards }: { cards: TotsCard[] }) {
  const t = useT(); const tt = t.career.tots; const style = specialStyles.tots;
  const [league, setLeague] = useState<LeagueFilter>("all");
  const isBig = (value: string) => (bigLeagues as readonly string[]).includes(value);
  const shown = cards.filter((card) => league === "all" || (league === "rest" ? !isBig(card.league) : card.league === league));
  const filters: { key: LeagueFilter; label: string }[] = [
    { key: "all", label: tt.all },
    ...bigLeagues.map((key) => ({ key, label: t.sbc.leagues[key] })),
    { key: "rest", label: tt.rest },
  ];
  return <div className="grid gap-5">
    <div className="rounded-xl border-2 p-4 text-white" style={{ background: style.background, borderColor: style.border }}>
      <p className="text-xs font-black tracking-[.3em]" style={{ color: style.badge }}>★ {t.career.special.name.tots}</p>
      <p className="mt-1 text-sm text-white/75">{tt.intro(cards.length)}</p>
    </div>
    <div className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1">
      {filters.map((filter) => <button key={filter.key} type="button" onClick={() => setLeague(filter.key)} aria-pressed={league === filter.key} className={`rounded-lg px-3 py-2 text-sm font-black transition ${league === filter.key ? "bg-lime-300 text-slate-950" : "text-white/60 hover:text-white"}`}>{filter.label}</button>)}
    </div>
    {shown.length ? <>
      <p className="text-xs text-white/55">{tt.count(shown.length)}</p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
        {shown.map((card) => <li key={card.id}><PlayerCardFace player={card} className="h-full" footer={<p className="text-center text-xs font-black tracking-widest" style={{ color: style.badge }}>{tt.boost(card.boost)}</p>} /></li>)}
      </ul>
    </> : <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">{tt.empty}</p>}
  </div>;
}
