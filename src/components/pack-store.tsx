"use client";

import { useActionState, useEffect, useState, type CSSProperties } from "react";
import type { ManagerPack } from "@/lib/career";
import { openManagerPackAction, type PackActionState, type PackPull } from "@/lib/manager-actions";
import { PlayerCardFace } from "./player-card-face";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";

const initial: PackActionState = {};
// Grensa for det store trekket. Alt herfra og opp får walkout slik som i FIFA.
const walkoutFrom = 86;

function glowFor(overall: number) {
  if (overall >= 90) return "#ff2fb0";
  if (overall >= walkoutFrom) return "#f2c94c";
  if (overall >= 82) return "#cfd6e4";
  return "#c08457";
}

function tierLabel(tier: { min: number; max: number }) {
  return tier.max >= 99 ? `${tier.min}+` : `${tier.min}–${tier.max}`;
}

function PackOdds({ pack }: { pack: ManagerPack }) {
  const total = pack.odds.reduce((sum, tier) => sum + tier.weight, 0);
  return <dl className="grid gap-1 text-xs">
    {[...pack.odds].reverse().map((tier) => <div key={tier.min} className="flex items-center justify-between gap-3">
      <dt className="text-muted">Rating {tierLabel(tier)}</dt>
      <dd className="font-semibold tabular-nums">{(100 * tier.weight / total).toFixed(1)} %</dd>
    </div>)}
  </dl>;
}

function PackReveal({ pulls, packName, onClose }: { pulls: PackPull[]; packName: string; onClose: () => void }) {
  // index -1 mens pakka ryker opp, deretter ett steg per kort, til slutt oppsummeringen.
  // Index og revealed ligger i samme tilstand, slik at et nytt kort alltid starter
  // skjult uten at en effekt må nullstille noe.
  const [phase, setPhase] = useState({ index: -1, revealed: false });
  const { index, revealed } = phase;
  const card = index >= 0 && index < pulls.length ? pulls[index] : null;
  const walkout = (card?.overall ?? 0) >= walkoutFrom;

  useEffect(() => {
    if (index !== -1) return;
    const timer = setTimeout(() => setPhase({ index: 0, revealed: false }), 900);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (!card || revealed) return;
    const timer = setTimeout(() => setPhase((current) => ({ ...current, revealed: true })), walkout ? 1500 : 650);
    return () => clearTimeout(timer);
  }, [card, revealed, walkout]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const next = () => { if (revealed) setPhase((current) => ({ index: current.index + 1, revealed: false })); };
  const done = index >= pulls.length;
  const best = pulls.reduce((top, pull) => Math.max(top, pull.overall), 0);

  return <div className="pack-stage" role="dialog" aria-modal="true" aria-label={`Åpner ${packName}`}>
    {done ? <div className="grid max-h-full w-full max-w-4xl gap-4 overflow-y-auto">
      <div className="text-center text-white">
        <p className="text-xs font-bold tracking-[.3em] text-white/60">{packName.toUpperCase()}</p>
        <h2 className="mt-1 text-3xl font-black">Du fikk {pulls.length} kort</h2>
        <p className="mt-1 text-sm text-white/70">Beste kort: {best}. Kortene ligger i troppen, eller på lageret hvis troppen var full.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pulls.map((pull) => <div key={pull.card_id} className="grid gap-1">
          <PlayerCardFace player={pull} />
          <p className="text-center text-xs text-white/70">{pull.location === "storage" ? "Til lageret" : "I troppen"}{pull.duplicate ? " · duplikat" : ""}</p>
        </div>)}
      </div>
      {/* Ingen autoFocus: den ville rullet oppsummeringen ned til knappen og skjult kortene. */}
      <div className="flex justify-center pb-2"><button className={buttonClass} onClick={onClose}>Ferdig</button></div>
    </div> : <button type="button" onClick={next} className="absolute inset-0 grid place-items-center focus:outline-none" aria-label={revealed ? "Neste kort" : "Åpner kort"}>
      <div className={revealed && walkout ? "pack-shake grid place-items-center" : "grid place-items-center"}>
        {card ? <div className="pack-rays" style={{ "--pack-glow": glowFor(card.overall) } as CSSProperties} /> : null}
        {card && !revealed && walkout ? <div className="pack-door" style={{ "--pack-glow": glowFor(card.overall) } as CSSProperties} /> : null}
        {card && revealed && walkout ? <div className="pack-flash" /> : null}

        {index === -1 ? <div className="pack-tear grid h-72 w-56 place-items-center rounded-2xl border border-white/25 bg-[linear-gradient(145deg,#12261a,#061009)] text-center text-white shadow-2xl">
          <div><p className="text-xs font-bold tracking-[.3em] text-white/60">ÅPNER</p><p className="mt-2 px-3 text-xl font-black">{packName}</p></div>
        </div> : null}

        {card && !revealed ? <div className="relative grid h-[27rem] w-72 place-items-center rounded-2xl border border-white/25 bg-black/50 text-white shadow-2xl">
          <div className="text-center"><p className="text-5xl font-black">{card.position}</p><p className="mt-2 text-xs font-bold tracking-[.3em] text-white/60">{walkout ? "…" : "KORT"}</p></div>
        </div> : null}

        {card && revealed ? <div className="relative grid gap-2">
          <div className={walkout ? "pack-card-walkout w-72" : "pack-card-enter w-72"}><PlayerCardFace player={card} /></div>
          <p className="pack-label-rise text-center text-sm text-white/75">
            {walkout ? "Stort kort!" : ""} {card.location === "storage" ? "Lagt på lageret" : "Lagt i troppen"}{card.duplicate ? " · du hadde ham fra før" : ""}
          </p>
          <p className="text-center text-xs text-white/50">{index + 1} av {pulls.length} · trykk for {index + 1 === pulls.length ? "oppsummering" : "neste"}</p>
        </div> : null}
      </div>
    </button>}
  </div>;
}

export function PackStore({ packs, budget, blockedByDuplicate }: { packs: ManagerPack[]; budget: number; blockedByDuplicate: boolean }) {
  const [state, action, pending] = useActionState(openManagerPackAction, initial);
  const [openOdds, setOpenOdds] = useState<string | null>(null);
  const [shownAt, setShownAt] = useState<number | null>(null);
  // Hvert trekk har sitt eget tidsstempel, så to like pakker etter hverandre
  // starter animasjonen på nytt i stedet for å bli stående.
  const showing = state.pulls?.length && state.openedAt && state.openedAt !== shownAt ? state.pulls : null;

  return <section className={`${cardClass} grid gap-4`}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-muted">PAKKER</p>
        <h2 className="mt-1 text-2xl font-bold">Bruk managerpoeng på pakker</h2>
        <p className="mt-1 text-sm text-muted">Dyrere pakke gir flere kort og bedre odds. Kortene havner i troppen, eller på lageret hvis troppen er full.</p>
      </div>
      <b className="rounded-xl bg-accent-soft px-4 py-3 text-xl text-accent">{budget} MB</b>
    </div>

    {blockedByDuplicate ? <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">Du har duplikater som må selges eller kastes før du kan åpne flere pakker.</p> : null}

    <div className="grid gap-3 sm:grid-cols-2">
      {packs.map((pack) => {
        const affordable = budget >= pack.price;
        return <div key={pack.key} className="grid gap-3 rounded-xl border border-border bg-surface-raised p-4" style={{ borderTopColor: pack.accent, borderTopWidth: 3 }}>
          <div>
            <h3 className="text-lg font-bold">{pack.name}</h3>
            <p className="text-sm text-muted">{pack.description}</p>
            <p className="mt-2 text-sm">{pack.card_count} kort · garanti: {pack.guarantee_count}× {pack.guarantee_min}+</p>
          </div>
          <button type="button" className="justify-self-start text-xs underline" onClick={() => setOpenOdds((current) => current === pack.key ? null : pack.key)} aria-expanded={openOdds === pack.key}>
            {openOdds === pack.key ? "Skjul sannsynligheter" : "Vis sannsynligheter"}
          </button>
          {openOdds === pack.key ? <div className="grid gap-2 rounded-lg border border-border p-3">
            <PackOdds pack={pack} />
            <p className="text-xs text-muted">Sjansen gjelder per kort i pakka. Garantien sjekkes etterpå og bytter ut det svakeste kortet hvis den ikke er oppfylt.</p>
          </div> : null}
          <form action={action} className="mt-auto flex items-center justify-between gap-3">
            <input type="hidden" name="pack_key" value={pack.key} />
            <span className="rounded-full bg-black/10 px-3 py-1 text-sm font-bold">{pack.price} MB</span>
            <button className={affordable ? buttonClass : secondaryButtonClass} disabled={!affordable || pending || blockedByDuplicate}>
              {pending ? "Åpner…" : affordable ? "Åpne pakke" : "For dyr"}
            </button>
          </form>
        </div>;
      })}
    </div>

    {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
    {showing ? <PackReveal pulls={showing} packName={packs.find((pack) => pack.key === state.packKey)?.name ?? "Pakke"} onClose={() => setShownAt(state.openedAt ?? null)} /> : null}
  </section>;
}
