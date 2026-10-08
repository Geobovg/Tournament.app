"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";
import { arenaOf, arenas, divisionRating, type Arena } from "@/lib/arenas";
import type { AiSeason } from "@/lib/seasons";
import { useScrollLock } from "./use-scroll-lock";

/** Bakgrunnen for sesong- og kampskjermen i arenaens farger. */
export function arenaBackground(arena: number) {
  const { colors } = arenaOf(arena);
  return `radial-gradient(ellipse at 85% 0%, ${colors.glow}, transparent 45%), radial-gradient(ellipse at 0% 100%, ${colors.glow}, transparent 40%), ${colors.base}`;
}

/**
 * Et tegnet stadion i arenaens farger: tribuner, flomlys og bane. Det er en egen illustrasjon,
 * ikke et bilde av det ekte stadionet. Høyere arenaer får flere tribuneringer og flere lys.
 */
export function StadiumIllustration({ arena, className = "" }: { arena: number; className?: string }) {
  const { colors, number } = arenaOf(arena);
  const tiers = Math.min(number + 1, 4);
  const lights = number >= 3 ? [30, 90, 210, 270] : [40, 260];
  return <svg viewBox="0 0 300 140" className={className} role="img" aria-hidden>
    <defs>
      <linearGradient id={`pitch-${number}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2f8a3c" /><stop offset="1" stopColor="#1d5e28" /></linearGradient>
      <radialGradient id={`glow-${number}`} cx=".5" cy="0" r=".9"><stop offset="0" stopColor={colors.primary} stopOpacity=".45" /><stop offset="1" stopColor={colors.primary} stopOpacity="0" /></radialGradient>
    </defs>
    <rect width="300" height="140" fill={`url(#glow-${number})`} />
    {Array.from({ length: tiers }, (_, index) => {
      const inset = 14 + index * 12;
      return <path key={index} d={`M${inset} ${118 - index * 14} Q150 ${36 - index * 12} ${300 - inset} ${118 - index * 14} L${300 - inset} ${126 - index * 14} Q150 ${48 - index * 12} ${inset} ${126 - index * 14} Z`} fill={index % 2 ? colors.primary : "#ffffff"} opacity={0.12 + index * 0.08} />;
    })}
    {lights.map((x) => <g key={x}><line x1={x} y1="20" x2={x} y2="62" stroke="#cbd5e1" strokeWidth="2" opacity=".55" /><rect x={x - 7} y="14" width="14" height="7" rx="1.5" fill="#fff8d6" /><path d={`M${x - 7} 21 L${x - 30} 90 L${x + 30} 90 L${x + 7} 21 Z`} fill="#fff8d6" opacity=".06" /></g>)}
    <ellipse cx="150" cy="116" rx="118" ry="18" fill={`url(#pitch-${number})`} />
    <ellipse cx="150" cy="116" rx="118" ry="18" fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="1" />
    <line x1="150" y1="98" x2="150" y2="134" stroke="#ffffff" strokeOpacity=".5" strokeWidth="1" />
    <ellipse cx="150" cy="116" rx="16" ry="4" fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="1" />
  </svg>;
}

/** Arenaveien som i Clash Royale: alle fem stadionene, hvor du er nå og hva som er låst opp. */
export function ArenaRoad({ season }: { season: AiSeason }) {
  const t = useT(); const text = t.seasons.arena;
  return <section className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/75 p-4 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><p className="text-xs font-black tracking-[.22em] text-lime-300">{text.roadEyebrow}</p><h3 className="text-xl font-black">{text.roadTitle}</h3><p className="mt-1 text-sm text-white/55">{text.roadIntro}</p></div>
      {season.championTitles ? <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">🏆 {text.championTitles(season.championTitles)}</span> : null}
    </div>
    <ol className="grid gap-2">
      {[...arenas].reverse().map((arena) => {
        const current = arena.number === season.arena;
        const reached = arena.number <= season.highestArena;
        return <li key={arena.number} className={`relative grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-xl border p-2 sm:grid-cols-[140px_minmax(0,1fr)] ${current ? "border-2" : "border-white/10"} ${reached ? "" : "opacity-55"}`} style={{ background: arenaBackground(arena.number), ...(current ? { borderColor: arena.colors.primary } : {}) }}>
          <StadiumIllustration arena={arena.number} className={`h-16 w-full sm:h-20 ${reached ? "" : "grayscale"}`} />
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[.22em]" style={{ color: arena.colors.primary }}>{text.eyebrow(arena.number)} · {current ? text.current : reached ? text.reached : text.locked}</p>
            <p className="truncate text-lg font-black">{reached ? "" : "🔒 "}{arena.name}</p>
            <p className="text-xs text-white/60">{text.aiRange(divisionRating(arena.number, 10), divisionRating(arena.number, 1))}</p>
          </div>
        </li>;
      })}
    </ol>
  </section>;
}

const seenKey = (arena: number) => `arena-unlock-seen-${arena}`;

/**
 * Feiring første gang man ser en ny arena. Hvem som har sett den, huskes bare i denne nettleseren.
 * Klarer ikke nettleseren å lagre det, vises feiringen ikke, så den aldri blir en plage.
 */
export function ArenaUnlockCelebration({ season }: { season: AiSeason }) {
  const t = useT(); const text = t.seasons.arena;
  const [open, setOpen] = useState(false);
  const fresh = season.arena > 1 && season.previous?.outcome === "promoted" && season.previous.division === 1 && season.previous.arena === season.arena - 1 && season.played === 0;
  useEffect(() => {
    if (!fresh) return;
    try {
      if (window.localStorage.getItem(seenKey(season.arena))) return;
      window.localStorage.setItem(seenKey(season.arena), "1");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lagringen finnes bare i nettleseren, så feiringen kan først åpnes etter at siden er lastet
      setOpen(true);
    } catch {
      // Uten lagring hoppes feiringen over.
    }
  }, [fresh, season.arena]);
  if (!open) return null;
  return <Celebration arena={arenaOf(season.arena)} title={text.unlockedTitle} body={text.unlockedBody(arenaOf(season.arena).name)} button={text.continue} onClose={() => setOpen(false)} />;
}

function Celebration({ arena, title, body, button, onClose }: { arena: Arena; title: string; body: string; button: string; onClose: () => void }) {
  useScrollLock();
  return createPortal(<div className="pack-stage" role="dialog" aria-modal="true" aria-label={title}>
    <div className="pack-rays" style={{ "--pack-glow": arena.colors.primary } as React.CSSProperties} />
    <div className="pack-card-walkout relative grid w-full max-w-md gap-4 rounded-2xl border-2 p-6 text-center text-white shadow-2xl" style={{ background: arenaBackground(arena.number), borderColor: arena.colors.primary }}>
      <p className="text-xs font-black tracking-[.3em]" style={{ color: arena.colors.primary }}>{title.toUpperCase()}</p>
      <StadiumIllustration arena={arena.number} className="h-32 w-full" />
      <h2 className="text-3xl font-black italic">{arena.name}</h2>
      <p className="text-sm text-white/75">{body}</p>
      <button type="button" onClick={onClose} className="justify-self-center rounded-xl px-6 py-3 font-black text-slate-950" style={{ background: arena.colors.primary }}>{button}</button>
    </div>
  </div>, document.body);
}

/** Stripe øverst på kampskjermen for AI-sesongkamper: stadion og arena. */
export function ArenaBanner({ arena }: { arena: number }) {
  const t = useT();
  const info = arenaOf(arena);
  return <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border p-2 text-white" style={{ background: arenaBackground(arena), borderColor: `${info.colors.primary}66` }}>
    <StadiumIllustration arena={arena} className="h-12 w-28 shrink-0" />
    <div className="min-w-0"><p className="text-[10px] font-black tracking-[.22em]" style={{ color: info.colors.primary }}>{t.seasons.arena.eyebrow(arena)}</p><p className="truncate font-black">{info.name}</p></div>
  </div>;
}
