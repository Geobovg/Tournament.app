"use client";

import { useActionState, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { ManagerPack } from "@/lib/career";
import { openManagerPackAction, type PackActionState, type PackPull } from "@/lib/manager-actions";
import { useLocale, useT } from "@/i18n/client";
import { INTL_LOCALES, type Locale } from "@/i18n/locales";
import { PlayerCardFace } from "./player-card-face";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";
import { useScrollLock } from "./use-scroll-lock";

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

// Stjernesjansene er små, så de vises med flere desimaler i stedet for å rundes til 0,0 %.
function oddsLabel(percent: number, locale: Locale) {
  return percent.toLocaleString(INTL_LOCALES[locale], { maximumFractionDigits: percent < 1 ? 2 : 1 });
}

function PackOdds({ pack }: { pack: ManagerPack }) {
  const tp = useT().market.packs;
  const locale = useLocale();
  const total = pack.odds.reduce((sum, tier) => sum + tier.weight, 0);
  return <dl className="grid gap-1 text-xs">
    {[...pack.odds].reverse().map((tier) => <div key={tier.min} className="flex items-center justify-between gap-3">
      <dt className="text-muted">{tp.rating(tierLabel(tier))}</dt>
      <dd className="font-semibold tabular-nums">{tp.percent(oddsLabel(100 * tier.weight / total, locale))}</dd>
    </div>)}
  </dl>;
}

function PackReveal({ pulls, packName, onClose }: { pulls: PackPull[]; packName: string; onClose: () => void }) {
  const tp = useT().market.packs;
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
  useScrollLock();

  // Portal til body: butikken ligger i et kort med backdrop-blur, og da ville «fixed» blitt
  // regnet fra kortet i stedet for skjermen, så man måtte bla opp for å se pakka.
  return createPortal(<div className="pack-stage" role="dialog" aria-modal="true" aria-label={tp.opening(packName)}>
    {/* Alle kortene i pakka tegnes usynlig med en gang, så bilde, flagg og klubbmerke
        lastes ned mens pakka ryker opp og ligger klare når hvert kort snus. */}
    {done ? null : <div aria-hidden className="pointer-events-none invisible absolute left-0 top-0 w-72 overflow-hidden">
      {pulls.map((pull) => <PlayerCardFace key={pull.card_id} player={pull} eager />)}
    </div>}
    {done ? <div className="grid max-h-full w-full max-w-4xl gap-4 overflow-y-auto">
      <div className="text-center text-white">
        <p className="text-xs font-bold tracking-[.3em] text-white/60">{packName.toUpperCase()}</p>
        <h2 className="mt-1 text-3xl font-black">{tp.youGot(pulls.length)}</h2>
        <p className="mt-1 text-sm text-white/70">{tp.bestCard(best)}</p>
      </div>
      {/* Knappen står øverst og blir liggende når man ruller, så man slipper å bla ned for å gå videre. */}
      <div className="sticky top-0 z-10 flex justify-center py-1"><button className={`${buttonClass} shadow-lg`} onClick={onClose}>{tp.done}</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pulls.map((pull) => <div key={pull.card_id} className="grid gap-1">
          <PlayerCardFace player={pull} eager />
          <p className="text-center text-xs text-white/70">{pull.location === "storage" ? tp.toStorage : tp.inSquad}{pull.duplicate ? tp.duplicate : ""}</p>
        </div>)}
      </div>
    </div> : <button type="button" onClick={next} className="absolute inset-0 grid place-items-center focus:outline-none" aria-label={revealed ? tp.nextCard : tp.openingCard}>
      <div className={revealed && walkout ? "pack-shake grid place-items-center" : "grid place-items-center"}>
        {card ? <div className="pack-rays" style={{ "--pack-glow": glowFor(card.overall) } as CSSProperties} /> : null}
        {card && !revealed && walkout ? <div className="pack-door" style={{ "--pack-glow": glowFor(card.overall) } as CSSProperties} /> : null}
        {card && revealed && walkout ? <div className="pack-flash" /> : null}

        {index === -1 ? <div className="pack-tear grid h-72 w-56 place-items-center rounded-2xl border border-white/25 bg-[linear-gradient(145deg,#12261a,#061009)] text-center text-white shadow-2xl">
          <div><p className="text-xs font-bold tracking-[.3em] text-white/60">{tp.openingBanner}</p><p className="mt-2 px-3 text-xl font-black">{packName}</p></div>
        </div> : null}

        {card && !revealed ? <div className="relative grid h-[27rem] w-72 place-items-center rounded-2xl border border-white/25 bg-black/50 text-white shadow-2xl">
          <div className="text-center"><p className="text-5xl font-black">{card.position}</p><p className="mt-2 text-xs font-bold tracking-[.3em] text-white/60">{walkout ? "…" : tp.cardBanner}</p></div>
        </div> : null}

        {card && revealed ? <div className="relative grid gap-2">
          <div className={walkout ? "pack-card-walkout w-72" : "pack-card-enter w-72"}><PlayerCardFace player={card} eager /></div>
          <p className="pack-label-rise text-center text-sm text-white/75">
            {walkout ? tp.bigCard : ""} {card.location === "storage" ? tp.placedInStorage : tp.placedInSquad}{card.duplicate ? tp.alreadyOwned : ""}
          </p>
          <p className="text-center text-xs text-white/50">{tp.progress(index + 1, pulls.length)}</p>
        </div> : null}
      </div>
    </button>}
  </div>, document.body);
}

export function PackStore({ packs, freePacks, budget, blockedByDuplicate }: { packs: ManagerPack[]; freePacks: Record<string, number>; budget: number; blockedByDuplicate: boolean }) {
  const tp = useT().market.packs;
  const nameOf = (pack: ManagerPack) => tp.name(pack.key, pack.name);
  const [state, action, pending] = useActionState(openManagerPackAction, initial);
  const [openOdds, setOpenOdds] = useState<string | null>(null);
  const [shownAt, setShownAt] = useState<number | null>(null);
  // Hvert trekk har sitt eget tidsstempel, så to like pakker etter hverandre
  // starter animasjonen på nytt i stedet for å bli stående.
  const showing = state.pulls?.length && state.openedAt && state.openedAt !== shownAt ? state.pulls : null;
  const openedPack = packs.find((pack) => pack.key === state.packKey);

  return <section className={`${cardClass} grid gap-4`}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-muted">{tp.eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold">{tp.title}</h2>
        <p className="mt-1 text-sm text-muted">{tp.intro}</p>
      </div>
      <b className="rounded-xl bg-accent-soft px-4 py-3 text-xl text-accent">{budget} MB</b>
    </div>

    {Object.values(freePacks).some(Boolean) ? <p className="rounded-lg border border-accent/40 bg-accent-soft p-3 text-sm font-semibold text-accent">{tp.freePacks(packs.filter((pack) => freePacks[pack.key]).map((pack) => `${freePacks[pack.key]}× ${nameOf(pack)}`).join(", "))}</p> : null}

    {blockedByDuplicate ? <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{tp.blockedByDuplicate}</p> : null}

    <div className="grid gap-3 sm:grid-cols-2">
      {packs.map((pack) => {
        const affordable = budget >= pack.price;
        const free = freePacks[pack.key] ?? 0;
        return <div key={pack.key} className="grid gap-3 rounded-xl border border-border bg-surface-raised p-4" style={{ borderTopColor: pack.accent, borderTopWidth: 3 }}>
          <div>
            <h3 className="text-lg font-bold">{nameOf(pack)}</h3>
            <p className="text-sm text-muted">{tp.description(pack.key, pack.description)}</p>
            <p className="mt-2 text-sm">{tp.cardCount(pack.card_count)} · {pack.guarantees.length ? tp.guarantee(pack.guarantees.map((guarantee) => `${guarantee.count}× ${guarantee.min}+`).join(", ")) : tp.noGuarantee}</p>
          </div>
          <button type="button" className="justify-self-start text-xs underline" onClick={() => setOpenOdds((current) => current === pack.key ? null : pack.key)} aria-expanded={openOdds === pack.key}>
            {openOdds === pack.key ? tp.hideOdds : tp.showOdds}
          </button>
          {openOdds === pack.key ? <div className="grid gap-2 rounded-lg border border-border p-3">
            <PackOdds pack={pack} />
            <p className="text-xs text-muted">{tp.oddsNote}</p>
          </div> : null}
          <div className="mt-auto grid gap-2">
            {free ? <form action={action} className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2">
              <input type="hidden" name="pack_key" value={pack.key} />
              <input type="hidden" name="free" value="1" />
              <span className="text-sm font-bold text-accent">{tp.freeCount(free)}</span>
              <button className={buttonClass} disabled={pending || blockedByDuplicate}>{pending ? tp.openingShort : tp.openFree}</button>
            </form> : null}
            <form action={action} className="flex items-center justify-between gap-3">
              <input type="hidden" name="pack_key" value={pack.key} />
              <span className="rounded-full bg-black/10 px-3 py-1 text-sm font-bold">{pack.price} MB</span>
              <button className={affordable ? buttonClass : secondaryButtonClass} disabled={!affordable || pending || blockedByDuplicate}>
                {pending ? tp.openingShort : affordable ? tp.openPack : tp.tooExpensive}
              </button>
            </form>
          </div>
        </div>;
      })}
    </div>

    {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
    {showing ? <PackReveal pulls={showing} packName={openedPack ? nameOf(openedPack) : tp.fallbackName} onClose={() => setShownAt(state.openedAt ?? null)} /> : null}
  </section>;
}
