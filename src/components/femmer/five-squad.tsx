"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/lib/actions";
import type { FiveCard } from "@/lib/femmer/data";
import { saveFiveLineupAction } from "@/lib/femmer/actions";
import { FIVE_BENCH, FIVE_XP_PER_LEVEL, fiveFormationNames, fiveFormations, fivePositionPenalty, type FiveFormation, type FiveRole } from "@/lib/femmer/rules";
import { teamRating } from "@/lib/femmer/match";
import { buttonClass, cardClass, secondaryButtonClass } from "../ui";
import { FiveCardTile } from "./five-card";
import { FiveCardDialog } from "./five-card-dialog";

const initial: ActionState = {};
type Place = { area: "starters" | "bench" | "reserves"; index: number };
const placeKey = (place: Place) => `${place.area}:${place.index}`;
function parsePlace(value: string | undefined): Place | null {
  const [area, index] = (value ?? "").split(":");
  return area === "starters" || area === "bench" || area === "reserves" ? { area, index: Number(index) } : null;
}
/** Musa begynner å dra etter noen piksler. På mobil må man holde fingeren litt, ellers er det vanlig scrolling. */
const DRAG_DISTANCE = 6;
const TOUCH_HOLD_MS = 220;

/** Beste lag: for hver plass det beste kortet med riktig posisjon, ellers det beste som er igjen. Én person per lag. */
function bestTeam(cards: FiveCard[], formation: FiveFormation) {
  const sorted = [...cards].sort((first, second) => second.overall - first.overall);
  const usedPeople = new Set<string>(); const starters: (string | null)[] = [];
  const take = (card: FiveCard | undefined) => { if (!card) return null; usedPeople.add(card.personId); return card.id; };
  for (const slot of fiveFormations[formation]) starters.push(take(sorted.find((card) => !usedPeople.has(card.personId) && card.position === slot.role)));
  starters.forEach((id, index) => { if (!id) starters[index] = take(sorted.find((card) => !usedPeople.has(card.personId))); });
  const bench: (string | null)[] = [];
  for (const card of sorted) if (bench.length < FIVE_BENCH && !usedPeople.has(card.personId)) bench.push(take(card));
  while (bench.length < FIVE_BENCH) bench.push(null);
  return { starters, bench };
}

/**
 * Laguttaket: fem på banen, fem på benken og resten som reserver. Trykk på ett kort og så et annet
 * for å bytte plass på dem. Ingenting lagres før man trykker «Lagre laget». Siden får en ny `key` når det
 * lagrede uttaket endres (f.eks. når en pakke la nye kort på benken), så tilstanden her starter på nytt da.
 */
export function FiveSquad({ cards, starters: savedStarters, bench: savedBench, formation: savedFormation, coins }: { cards: FiveCard[]; starters: string[]; bench: string[]; formation: FiveFormation; coins: number }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(saveFiveLineupAction, initial);
  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const [formation, setFormation] = useState(savedFormation);
  const [starters, setStarters] = useState<(string | null)[]>(() => Array.from({ length: 5 }, (_, index) => savedStarters[index] ?? null));
  const [bench, setBench] = useState<(string | null)[]>(() => Array.from({ length: FIVE_BENCH }, (_, index) => savedBench[index] ?? null));
  const [selected, setSelected] = useState<Place | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  const used = new Set([...starters, ...bench].filter((id): id is string => Boolean(id)));
  const reserves = cards.filter((card) => !used.has(card.id)).map((card) => card.id);
  const dirty = formation !== savedFormation || starters.join() !== Array.from({ length: 5 }, (_, index) => savedStarters[index] ?? "").join() || bench.filter(Boolean).join() !== savedBench.join();
  const starterCards = starters.map((id) => (id ? byId.get(id) : undefined)).filter((card): card is FiveCard => Boolean(card));
  const rating = teamRating(starterCards);
  const lineupPeople = [...starters, ...bench].map((id) => (id ? byId.get(id)?.personId : undefined)).filter(Boolean);
  const duplicatePerson = new Set(lineupPeople).size !== lineupPeople.length;

  const idAt = (place: Place) => place.area === "starters" ? starters[place.index] : place.area === "bench" ? bench[place.index] : reserves[place.index] ?? null;
  const setAt = (place: Place, id: string | null, nextStarters: (string | null)[], nextBench: (string | null)[]) => {
    if (place.area === "starters") nextStarters[place.index] = id;
    else if (place.area === "bench") nextBench[place.index] = id;
  };
  const swap = (first: Place, second: Place) => {
    if (placeKey(first) === placeKey(second)) return;
    const firstId = idAt(first); const secondId = idAt(second);
    const nextStarters = [...starters]; const nextBench = [...bench];
    setAt(first, secondId, nextStarters, nextBench);
    setAt(second, firstId, nextStarters, nextBench);
    setStarters(nextStarters); setBench(nextBench);
  };
  const tap = (place: Place) => {
    if (!selected) { if (idAt(place) || place.area !== "reserves") setSelected(place); return; }
    if (placeKey(selected) !== placeKey(place)) swap(selected, place);
    setSelected(null);
  };

  // ---- Dra og slipp ----------------------------------------------------------------
  // Kortet som dras, følger fingeren/musa i et eget lag som flyttes direkte (uten ny tegning av
  // siden). Bare målet under fingeren ligger i state, så siden tegnes bare når det endrer seg.
  const [dragging, setDragging] = useState<Place | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const press = useRef<{ place: Place; x: number; y: number; touch: boolean; timer: number | null; started: boolean } | null>(null);
  const suppressClick = useRef(false);
  const beginRef = useRef<() => void>(() => undefined);
  const swapRef = useRef(swap);
  useEffect(() => { swapRef.current = swap; });

  useEffect(() => {
    const moveGhost = (x: number, y: number) => { if (ghost.current) { ghost.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -60%)`; ghost.current.style.opacity = "1"; } };
    const targetAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest("[data-place]") as HTMLElement | null)?.dataset.place ?? null;
    const begin = () => {
      const current = press.current;
      if (!current) return;
      current.started = true;
      setSelected(null);
      setDragging(current.place);
      setOver(placeKey(current.place));
      requestAnimationFrame(() => moveGhost(current.x, current.y));
      navigator.vibrate?.(10);
    };
    const onMove = (event: PointerEvent) => {
      const current = press.current;
      if (!current) return;
      const moved = Math.hypot(event.clientX - current.x, event.clientY - current.y);
      if (!current.started) {
        // På mobil: beveger fingeren seg før den har holdt lenge nok, er det scrolling og ikke dra.
        if (current.touch) { if (moved > 10) cancel(); return; }
        if (moved < DRAG_DISTANCE) return;
        current.x = event.clientX; current.y = event.clientY;
        begin();
        return;
      }
      moveGhost(event.clientX, event.clientY);
      const target = targetAt(event.clientX, event.clientY);
      setOver((previous) => (previous === target ? previous : target));
    };
    const onUp = (event: PointerEvent) => {
      const current = press.current;
      if (!current) return;
      if (current.started) {
        const target = parsePlace(targetAt(event.clientX, event.clientY) ?? undefined);
        if (target) swapRef.current(current.place, target);
        suppressClick.current = true;
        setTimeout(() => { suppressClick.current = false; }, 0);
      }
      cancel();
    };
    // Mens et kort dras på mobil, skal ikke siden scrolle under fingeren.
    const onTouchMove = (event: TouchEvent) => { if (press.current?.started) event.preventDefault(); };
    function cancel() {
      if (press.current?.timer) clearTimeout(press.current.timer);
      press.current = null;
      setDragging(null); setOver(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    beginRef.current = begin;
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const startPress = (event: React.PointerEvent, place: Place) => {
    if (!idAt(place) || event.button > 0) return;
    const touch = event.pointerType !== "mouse";
    press.current = { place, x: event.clientX, y: event.clientY, touch, timer: null, started: false };
    if (touch) press.current.timer = window.setTimeout(() => beginRef.current(), TOUCH_HOLD_MS);
  };
  const autoPick = () => {
    const best = bestTeam(cards, formation);
    setStarters(best.starters); setBench(best.bench); setSelected(null);
  };

  const isSelected = (place: Place) => selected?.area === place.area && selected.index === place.index;
  const slots = fiveFormations[formation];
  const tile = (id: string | null, place: Place, role?: FiveRole) => {
    const card = id ? byId.get(id) : null;
    const penalty = card && role ? fivePositionPenalty(card.position, role) : 0;
    const key = placeKey(place);
    const isSource = dragging !== null && placeKey(dragging) === key;
    const isTarget = dragging !== null && over === key && !isSource;
    // Hele flaten er både trykk- og dra-mål. select-none og touch-callout hindrer at mobilen markerer tekst når man holder.
    return <button type="button" data-place={key} onPointerDown={(event) => startPress(event, place)} onClick={() => { if (!suppressClick.current) tap(place); }} onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} className={`grid select-none justify-items-center rounded-xl [-webkit-touch-callout:none] ${isTarget ? "ring-4 ring-amber-300" : ""} ${isSource ? "opacity-40" : ""} ${dragging ? "cursor-grabbing" : card ? "cursor-grab" : ""}`} aria-pressed={isSelected(place)}>
      {card ? <FiveCardTile name={card.name} slug={card.slug} overall={card.overall} position={card.position} inform={Boolean(card.informId)} size="sm" label={role ? (penalty ? `${t.squad.roles[role]} −${penalty}` : t.squad.roles[role]) : undefined} warn={penalty > 0} selected={isSelected(place)} /> : <span className={`grid h-28 w-[72px] place-items-center rounded-xl border-2 border-dashed text-xs font-bold sm:h-36 sm:w-[92px] ${isSelected(place) || isTarget ? "border-lime-300 text-lime-300" : "border-white/25 text-white/45"}`}>{role ? t.squad.roles[role] : t.squad.empty}</span>}
    </button>;
  };
  const selectedId = selected ? idAt(selected) : null;
  const detailCard = details ? byId.get(details) : undefined;
  const draggedId = dragging ? idAt(dragging) : null;
  const dragCard = draggedId ? byId.get(draggedId) : undefined;

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
      <button type="submit" disabled={pending || !dirty || starters.some((id) => !id) || duplicatePerson} className={buttonClass}>{t.squad.save}</button>
    </div>
    <p className="text-sm text-muted">{t.squad.hint}</p>
    {/* Statuslinja har fast høyde og én linje, så banen under aldri flytter seg når den endrer innhold. */}
    <div className="flex h-11 items-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 px-3 text-sm">
      {selectedId ? <><span className="truncate font-bold text-lime-300">{byId.get(selectedId)?.name}</span><span className="hidden truncate text-muted sm:inline">{t.squad.tapTarget}</span><button type="button" onClick={() => { setDetails(selectedId); setSelected(null); }} className="ml-auto shrink-0 rounded-lg bg-white/10 px-3 py-1 text-xs font-black hover:bg-white/20">{t.squad.details}</button></>
        : duplicatePerson ? <span className="truncate text-amber-300">{t.errors.samePersonTwice}</span>
        : state.error ? <span className="truncate text-red-400">{state.error}</span>
        : dirty ? <span className="truncate font-bold text-amber-300">{t.squad.unsaved}</span>
        : <span className={`truncate font-bold ${state.ok ? "text-lime-300" : "text-lime-300/60"}`}>{t.squad.saved}</span>}
    </div>

    {/* Banen: et lite femmerfelt med eget mål nederst. */}
    <div className="relative mx-auto aspect-[4/5] w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(180deg,#0d5a3c,#12744c)]">
      <div className="absolute inset-3 rounded-xl border-2 border-white/40" />
      <div className="absolute inset-x-3 top-1/2 border-t-2 border-white/40" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
      <div className="absolute bottom-3 left-1/2 h-16 w-40 -translate-x-1/2 rounded-t-full border-2 border-b-0 border-white/40" />
      <div className="absolute left-1/2 top-3 h-16 w-40 -translate-x-1/2 rounded-b-full border-2 border-t-0 border-white/40" />
      {slots.map((slot, index) => <div key={index} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>{tile(starters[index], { area: "starters", index }, slot.role)}</div>)}
    </div>

    <section className={`${cardClass} grid gap-3`}>
      <div><h3 className="font-black">{t.squad.bench}</h3><p className="text-sm text-muted">{t.squad.benchHelp}</p></div>
      <div className="flex flex-wrap gap-2">{bench.map((id, index) => <div key={index}>{tile(id, { area: "bench", index })}</div>)}</div>
    </section>

    <section className={`${cardClass} grid gap-3`}>
      <h3 className="font-black">{t.squad.reserves}</h3>
      {reserves.length ? <div className="flex flex-wrap gap-2">{reserves.map((id, index) => <div key={id}>{tile(id, { area: "reserves", index })}</div>)}</div> : <p className="text-sm text-muted">{t.squad.noReserves}</p>}
    </section>
    <p className="text-xs text-muted">{t.squad.positionRule} {t.cards.xpRule(FIVE_XP_PER_LEVEL)}</p>
    {detailCard ? <FiveCardDialog card={detailCard} coins={coins} onClose={() => setDetails(null)} /> : null}
    {dragCard ? <div ref={ghost} aria-hidden className="pointer-events-none fixed left-0 top-0 z-50 opacity-0 drop-shadow-2xl will-change-transform"><FiveCardTile name={dragCard.name} slug={dragCard.slug} overall={dragCard.overall} position={dragCard.position} inform={Boolean(dragCard.informId)} size="sm" /></div> : null}
  </form>;
}
