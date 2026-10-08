"use client";

import { useActionState, useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/lib/actions";
import type { FiveCard } from "@/lib/femmer/data";
import { saveFiveLineupAction } from "@/lib/femmer/actions";
import { FIVE_BENCH, FIVE_XP_PER_LEVEL, fiveFormationNames, fiveFormations, type FiveFormation } from "@/lib/femmer/rules";
import { teamRating } from "@/lib/femmer/match";
import { buttonClass, cardClass, secondaryButtonClass } from "../ui";
import { FiveCardTile } from "./five-card";

const initial: ActionState = {};
type Place = { area: "starters" | "bench" | "reserves"; index: number };

/**
 * Laguttaket: fem på banen, fem på benken og resten som reserver. Trykk på ett kort og så et annet
 * for å bytte plass på dem. Ingenting lagres før man trykker «Lagre laget». Siden får en ny `key` når det
 * lagrede uttaket endres (f.eks. når en pakke la nye kort på benken), så tilstanden her starter på nytt da.
 */
export function FiveSquad({ cards, starters: savedStarters, bench: savedBench, formation: savedFormation }: { cards: FiveCard[]; starters: string[]; bench: string[]; formation: FiveFormation }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(saveFiveLineupAction, initial);
  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const [formation, setFormation] = useState(savedFormation);
  const [starters, setStarters] = useState<(string | null)[]>(() => Array.from({ length: 5 }, (_, index) => savedStarters[index] ?? null));
  const [bench, setBench] = useState<(string | null)[]>(() => Array.from({ length: FIVE_BENCH }, (_, index) => savedBench[index] ?? null));
  const [selected, setSelected] = useState<Place | null>(null);

  const used = new Set([...starters, ...bench].filter((id): id is string => Boolean(id)));
  const reserves = cards.filter((card) => !used.has(card.id)).map((card) => card.id);
  const dirty = formation !== savedFormation || starters.join() !== Array.from({ length: 5 }, (_, index) => savedStarters[index] ?? "").join() || bench.filter(Boolean).join() !== savedBench.join();
  const rating = teamRating(starters.map((id) => (id ? byId.get(id) : undefined)).filter((card): card is FiveCard => Boolean(card)));

  const idAt = (place: Place) => place.area === "starters" ? starters[place.index] : place.area === "bench" ? bench[place.index] : reserves[place.index] ?? null;
  const setAt = (place: Place, id: string | null, nextStarters: (string | null)[], nextBench: (string | null)[]) => {
    if (place.area === "starters") nextStarters[place.index] = id;
    else if (place.area === "bench") nextBench[place.index] = id;
  };
  const tap = (place: Place) => {
    if (!selected) { if (idAt(place) || place.area !== "reserves") setSelected(place); return; }
    if (selected.area === place.area && selected.index === place.index) { setSelected(null); return; }
    const first = idAt(selected); const second = idAt(place);
    const nextStarters = [...starters]; const nextBench = [...bench];
    setAt(selected, second, nextStarters, nextBench);
    setAt(place, first, nextStarters, nextBench);
    setStarters(nextStarters); setBench(nextBench); setSelected(null);
  };
  // Beste fem på banen (best i mål), de neste fem på benken.
  const autoPick = () => {
    const sorted = [...cards].sort((first, second) => second.overall - first.overall);
    setStarters(Array.from({ length: 5 }, (_, index) => sorted[index]?.id ?? null));
    setBench(Array.from({ length: FIVE_BENCH }, (_, index) => sorted[5 + index]?.id ?? null));
    setSelected(null);
  };

  const isSelected = (place: Place) => selected?.area === place.area && selected.index === place.index;
  const slots = fiveFormations[formation];
  const tile = (id: string | null, place: Place, label?: string, size: "sm" | "md" = "sm") => {
    const card = id ? byId.get(id) : null;
    return <button type="button" onClick={() => tap(place)} className="grid justify-items-center" aria-pressed={isSelected(place)}>
      {card ? <FiveCardTile name={card.name} slug={card.slug} overall={card.overall} size={size} label={label} selected={isSelected(place)} /> : <span className={`grid h-28 w-[72px] place-items-center rounded-xl border-2 border-dashed text-xs font-bold sm:h-36 sm:w-[92px] ${isSelected(place) ? "border-lime-300 text-lime-300" : "border-white/25 text-white/45"}`}>{label ?? t.squad.empty}</span>}
    </button>;
  };

  return <form action={action} className="grid gap-4">
    <input type="hidden" name="formation" value={formation} />
    {starters.map((id, index) => id ? <input key={`s${index}`} type="hidden" name="starter_ids" value={id} /> : null)}
    {bench.map((id, index) => id ? <input key={`b${index}`} type="hidden" name="bench_ids" value={id} /> : null)}

    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm font-bold">{t.squad.formation}
        <select value={formation} onChange={(event) => setFormation(event.target.value as FiveFormation)} className="rounded-lg border border-border bg-surface px-2 py-1.5">{fiveFormationNames.map((name) => <option key={name} value={name}>{name}</option>)}</select>
      </label>
      <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-black">{t.teamRating}: {rating ?? "—"}</span>
      <button type="button" onClick={autoPick} className={secondaryButtonClass}>{t.squad.autoPick}</button>
      <button type="submit" disabled={pending || !dirty || starters.some((id) => !id)} className={buttonClass}>{t.squad.save}</button>
      {dirty ? <span className="text-sm font-bold text-amber-300">{t.squad.unsaved}</span> : state.ok ? <span className="text-sm font-bold text-lime-300">{t.squad.saved}</span> : null}
    </div>
    <p className="text-sm text-muted">{t.squad.hint}</p>
    {state.error ? <p className="text-red-400">{state.error}</p> : null}

    {/* Banen: et lite femmerfelt med eget mål nederst. */}
    <div className="relative mx-auto aspect-[4/5] w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(180deg,#0d5a3c,#12744c)]">
      <div className="absolute inset-3 rounded-xl border-2 border-white/40" />
      <div className="absolute inset-x-3 top-1/2 border-t-2 border-white/40" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
      <div className="absolute bottom-3 left-1/2 h-16 w-40 -translate-x-1/2 rounded-t-full border-2 border-b-0 border-white/40" />
      <div className="absolute left-1/2 top-3 h-16 w-40 -translate-x-1/2 rounded-b-full border-2 border-t-0 border-white/40" />
      {slots.map((slot, index) => <div key={index} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>{tile(starters[index], { area: "starters", index }, t.squad.roles[slot.role])}</div>)}
    </div>

    <section className={`${cardClass} grid gap-3`}>
      <div><h3 className="font-black">{t.squad.bench}</h3><p className="text-sm text-muted">{t.squad.benchHelp}</p></div>
      <div className="flex flex-wrap gap-2">{bench.map((id, index) => <div key={index}>{tile(id, { area: "bench", index })}</div>)}</div>
    </section>

    <section className={`${cardClass} grid gap-3`}>
      <h3 className="font-black">{t.squad.reserves}</h3>
      {reserves.length ? <div className="flex flex-wrap gap-2">{reserves.map((id, index) => <div key={id}>{tile(id, { area: "reserves", index })}</div>)}</div> : <p className="text-sm text-muted">{t.squad.noReserves}</p>}
    </section>
    <p className="text-xs text-muted">{t.cards.xpRule(FIVE_XP_PER_LEVEL)}</p>
  </form>;
}
