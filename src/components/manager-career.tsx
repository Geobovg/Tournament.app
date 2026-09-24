"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/actions";
import type { ManagerCard, ManagerLineup, ManagerPack, CatalogCard } from "@/lib/career";
import { squadCapacity, storageCapacity } from "@/lib/manager-limits";
import { buyCatalogCardAction, moveManagerCardAction, quickSellManagerCardAction, saveManagerLineupAction, swapManagerCardsAction } from "@/lib/manager-actions";
import { PackStore } from "./pack-store";
import { PlayerCardFace } from "./player-card-face";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";
import { clubCrest } from "@/lib/club-crests";
import { formationNames, formations, type Formation, canPlayPosition, pickBestLineup, rearrangeLineup } from "@/lib/lineup";
import { playerFlag } from "@/lib/player-nationalities";
import { playerPhoto } from "@/lib/player-photos";

const initial: ActionState = {};
const positionOrder = ["GK", "RB", "CB", "LB", "CDM", "CM", "CAM", "RW", "LW", "ST"];

function PlayerCard({ player, owned, budget, action, pending }: { player: CatalogCard; owned: boolean; budget: number; action: (formData: FormData) => void; pending: boolean }) {
  const canBuy = !owned && budget >= player.price;
  return <form action={action}>
    <PlayerCardFace player={player} className="group transition hover:-translate-y-1 hover:border-white/40" footer={<>
      <input type="hidden" name="catalog_id" value={player.id} />
      <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-black/20 px-3 py-1 text-sm font-bold">{player.price} MB</span><button className={canBuy ? buttonClass : secondaryButtonClass} disabled={!canBuy || pending}>{owned ? "Eies" : budget < player.price ? "For dyr" : "Kjøp kort"}</button></div>
    </>} />
  </form>;
}

function Catalog({ catalog, owned, budget }: { catalog: CatalogCard[]; owned: Set<string>; budget: number }) {
  const [state, action, pending] = useActionState(buyCatalogCardAction, initial);
  const [search, setSearch] = useState(""); const [sort, setSort] = useState("overall"); const [filtersOpen, setFiltersOpen] = useState(false);
  const [position, setPosition] = useState("all"); const [minimum, setMinimum] = useState("0"); const [maximumPrice, setMaximumPrice] = useState(""); const [clubs, setClubs] = useState<string[]>([]); const [clubSearch, setClubSearch] = useState("");
  const clubOptions = useMemo(() => [...new Set(catalog.map((player) => player.club))].sort((first, second) => first.localeCompare(second, "nb-NO")), [catalog]);
  const visibleClubs = useMemo(() => { const needle = clubSearch.trim().toLocaleLowerCase("nb-NO"); return needle ? clubOptions.filter((club) => club.toLocaleLowerCase("nb-NO").includes(needle)) : clubOptions; }, [clubOptions, clubSearch]);
  const parsedPrice = Number(maximumPrice); const priceLimit = maximumPrice.trim() === "" || !Number.isFinite(parsedPrice) ? Infinity : parsedPrice;
  const activeFilters = (position === "all" ? 0 : 1) + (minimum === "0" ? 0 : 1) + (Number.isFinite(priceLimit) ? 1 : 0) + (clubs.length ? 1 : 0);
  const cards = useMemo(() => {
    const selected = new Set(clubs);
    const matches = catalog.filter((player) => player.name.toLocaleLowerCase("nb-NO").includes(search.trim().toLocaleLowerCase("nb-NO")) && (position === "all" || player.position === position) && player.overall >= Number(minimum) && player.price <= priceLimit && (selected.size === 0 || selected.has(player.club)));
    if (sort === "price-asc") return matches.sort((first, second) => first.price - second.price || second.overall - first.overall);
    if (sort === "price-desc") return matches.sort((first, second) => second.price - first.price || second.overall - first.overall);
    return matches.sort((first, second) => second.overall - first.overall || first.price - second.price);
  }, [catalog, clubs, minimum, position, priceLimit, search, sort]);
  const toggleClub = (club: string) => setClubs((current) => current.includes(club) ? current.filter((item) => item !== club) : [...current, club]);
  const resetFilters = () => { setPosition("all"); setMinimum("0"); setMaximumPrice(""); setClubs([]); setClubSearch(""); };
  return <section className={`${cardClass} grid gap-4`}><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-muted">SPILLERMARKED</p><h2 className="mt-1 text-2xl font-bold">Bygg drømmelaget</h2><p className="mt-1 text-sm text-muted">Originale kort med realistisk nivå og pris, komplett med spillerbilde og klubbmerke.</p></div><b className="rounded-xl bg-accent-soft px-4 py-3 text-xl text-accent">{budget} MB</b></div>
    <div className="grid gap-2 rounded-xl border border-border bg-surface-raised p-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"><label className="text-xs text-muted">Søk<input className="mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Spiller…" /></label><label className="text-xs text-muted">Sorter<select className="mt-1 w-full" value={sort} onChange={(event) => setSort(event.target.value)}><option value="overall">Rating (høy–lav)</option><option value="price-asc">Pris (lav–høy)</option><option value="price-desc">Pris (høy–lav)</option></select></label><button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className={secondaryButtonClass}>{filtersOpen ? "Skjul filter" : "Filter"}{activeFilters ? ` (${activeFilters})` : ""}</button></div>
    {filtersOpen ? <div className="grid gap-3 rounded-xl border border-border bg-surface-raised p-3">
      <div className="grid gap-2 sm:grid-cols-3"><label className="text-xs text-muted">Posisjon<select className="mt-1 w-full" value={position} onChange={(event) => setPosition(event.target.value)}><option value="all">Alle</option>{positionOrder.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs text-muted">Min. rating<select className="mt-1 w-full" value={minimum} onChange={(event) => setMinimum(event.target.value)}>{[0, 70, 75, 80, 85, 90].map((value) => <option key={value} value={value}>{value === 0 ? "Alle" : `${value}+`}</option>)}</select></label><label className="text-xs text-muted">Maks pris (MB)<input className="mt-1 w-full" type="number" min="0" step="5" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} placeholder="Ingen grense" /></label></div>
      <div className="grid gap-2"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">Klubber{clubs.length ? ` · ${clubs.length} valgt` : " · alle"}</p><div className="flex gap-3 text-xs">{clubs.length ? <button type="button" className="underline" onClick={() => setClubs([])}>Fjern klubbvalg</button> : null}{activeFilters ? <button type="button" className="underline" onClick={resetFilters}>Nullstill alle filtre</button> : null}</div></div>
        {clubs.length ? <div className="flex flex-wrap gap-1">{clubs.map((club) => <button key={club} type="button" onClick={() => toggleClub(club)} className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent" aria-label={`Fjern ${club}`}>{club} ×</button>)}</div> : null}
        <input className="w-full" value={clubSearch} onChange={(event) => setClubSearch(event.target.value)} placeholder="Søk etter klubb…" aria-label="Søk etter klubb" />
        {visibleClubs.length ? <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2 lg:grid-cols-3">{visibleClubs.map((club) => <label key={club} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={clubs.includes(club)} onChange={() => toggleClub(club)} /><span className="truncate">{club}</span></label>)}</div> : <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">Ingen klubber matcher søket.</p>}</div>
    </div> : null}
    <p className="text-sm text-muted">Viser {cards.length} av {catalog.length} kort.</p>
    {cards.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map((player) => <PlayerCard key={player.id} player={player} owned={owned.has(player.id)} budget={budget} action={action} pending={pending} />)}</div> : <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">Ingen spillere passer filtrene.</p>}
    {state.error ? <p className="text-sm text-danger">{state.error}</p> : state.ok ? <p className="text-sm text-success">Spilleren er lagt til.</p> : null}
  </section>;
}

function SquadCard({ card, position, active, onPointerDown, onPointerUp, onClick, selected, compact = false }: { card: ManagerCard; position: string; active: boolean; onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void; onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void; onClick: () => void; selected: boolean; compact?: boolean }) {
  const photo = playerPhoto(card.slug ?? ""); const crest = clubCrest(card.club); const flag = playerFlag(card.slug);
  return <button type="button" data-lineup-card={card.id} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onClick={onClick} className={`relative overflow-hidden rounded-xl border text-left text-white shadow-lg transition ${compact ? "min-h-20 p-2" : "min-h-28 p-2.5"} ${active ? "border-cyan-300/90 ring-2 ring-cyan-300/50 scale-105" : "border-amber-200/70 hover:-translate-y-0.5 hover:border-white"} ${selected ? "ring-2 ring-white" : ""}`} style={{ background: `radial-gradient(circle at 80% 2%, ${card.accent}d9, transparent 42%), linear-gradient(145deg, #d7a835 0%, #805514 54%, #26160a 100%)`, touchAction: "none" }} aria-label={`${card.name}, ${card.overall}, ${position}`}>
    <span className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,.26),transparent_35%,rgba(0,0,0,.18))]" />
    <span className="relative grid grid-cols-[auto_1fr] items-start gap-1"><b className={`${compact ? "text-xl" : "text-2xl"} leading-none tracking-tighter`}>{card.overall}</b><span className="pt-0.5 text-[10px] font-black tracking-wider">{position}</span></span>
    {photo ? <Image src={photo} alt="" width={120} height={120} draggable={false} className={`pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 object-contain object-bottom drop-shadow-[0_5px_5px_rgba(0,0,0,.45)] ${compact ? "h-14 w-14" : "h-20 w-20"}`} /> : <span className="absolute bottom-7 left-1/2 -translate-x-1/2 text-3xl">⚽</span>}
    <span className="absolute bottom-0 left-0 right-0 flex items-center gap-1 border-t border-white/35 bg-black/40 px-1.5 py-1">{flag ? <Image src={flag} alt="" width={16} height={12} unoptimized draggable={false} className="h-3 w-4 shrink-0 rounded-[2px] object-cover ring-1 ring-black/30" /> : null}<b className="min-w-0 flex-1 truncate text-[10px] font-black uppercase leading-none">{card.name}</b>{crest ? <Image src={crest} alt="" width={16} height={16} className="h-4 w-4 object-contain" /> : null}</span>
  </button>;
}

function Squad({ cards, lineup }: { cards: ManagerCard[]; lineup: ManagerLineup | null }) {
  const savedFormation = formationNames.includes(lineup?.formation as Formation) ? lineup!.formation as Formation : "4-3-3";
  const initialLineup = useMemo(() => lineup?.starters.length === 11 && lineup.bench.length === 7 ? { starters: lineup.starters, bench: lineup.bench } : pickBestLineup(cards, savedFormation), [cards, lineup, savedFormation]);
  const [formation, setFormation] = useState<Formation>(savedFormation);
  const [starters, setStarters] = useState(initialLineup.starters);
  const [bench, setBench] = useState(initialLineup.bench);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [savedSnapshot] = useState(`${savedFormation}|${initialLineup.starters.join(",")}|${initialLineup.bench.join(",")}`);
  const [state, action, pending] = useActionState(saveManagerLineupAction, initial);
  const cardById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const reserves = cards.filter((card) => !starters.includes(card.id) && !bench.includes(card.id));
  const snapshot = `${formation}|${starters.join(",")}|${bench.join(",")}`;
  const canSave = starters.length === 11 && bench.length === 7 && snapshot !== savedSnapshot && !pending;

  const handleDrop = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    const source = cardById.get(sourceId); const target = cardById.get(targetId);
    if (!source || !target) return;
    const sourceStarter = starters.indexOf(sourceId); const targetStarter = starters.indexOf(targetId);
    const sourceBench = bench.indexOf(sourceId); const targetBench = bench.indexOf(targetId);
    const slots = formations[formation];
    if (targetStarter >= 0 && !canPlayPosition(source.position, slots[targetStarter].position)) { setNotice(`${source.name} kan ikke spille ${slots[targetStarter].position}.`); return; }
    if (sourceStarter >= 0 && targetStarter >= 0 && !canPlayPosition(target.position, slots[sourceStarter].position)) { setNotice(`${target.name} kan ikke spille ${slots[sourceStarter].position}.`); return; }
    const nextStarters = [...starters]; const nextBench = [...bench];
    if (targetStarter >= 0) {
      nextStarters[targetStarter] = sourceId;
      if (sourceStarter >= 0) nextStarters[sourceStarter] = targetId;
      else if (sourceBench >= 0) nextBench[sourceBench] = targetId;
    } else if (targetBench >= 0) {
      nextBench[targetBench] = sourceId;
      if (sourceStarter >= 0) nextStarters[sourceStarter] = targetId;
      else if (sourceBench >= 0) nextBench[sourceBench] = targetId;
    } else if (sourceStarter >= 0) nextStarters[sourceStarter] = targetId;
    else if (sourceBench >= 0) nextBench[sourceBench] = targetId;
    else return;
    setStarters(nextStarters); setBench(nextBench); setNotice("");
  };
  const pointerDown = (id: string) => (event: React.PointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedId(id); };
  const pointerUp = () => (event: React.PointerEvent<HTMLButtonElement>) => { const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-lineup-card]")?.dataset.lineupCard; if (draggedId && target) handleDrop(draggedId, target); setDraggedId(null); };
  const chooseFormation = (nextFormation: Formation) => { setFormation(nextFormation); const next = rearrangeLineup(cards, nextFormation, starters, bench); setStarters(next.starters); setBench(next.bench); setNotice(""); };
  const autoSelect = () => { const next = pickBestLineup(cards, formation); setStarters(next.starters); setBench(next.bench); setNotice("Beste gyldige ellever og benk er valgt."); };
  const selected = selectedId ? cardById.get(selectedId) : null;
  const selectedFlag = selected ? playerFlag(selected.slug) : null;
  const visibleSlots = formations[formation];
  return <section className={`${cardClass} grid gap-5 overflow-hidden`}><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-[.22em] text-cyan-300">SQUAD</p><h2 className="mt-1 text-2xl font-black">Troppen min</h2><p className="mt-1 text-sm text-muted">Dra kort for å bytte spillere. Du trenger 11 i elleveren og 7 på benken før laget kan lagres.</p></div><span className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{cards.length} / {squadCapacity}</span></div>
    <form action={action} className="grid gap-4"><input type="hidden" name="formation" value={formation} />{starters.map((id) => <input key={`starter-${id}`} type="hidden" name="starter_ids" value={id} />)}{bench.map((id) => <input key={`bench-${id}`} type="hidden" name="bench_ids" value={id} />)}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><label className="text-sm font-semibold text-white/75">Formasjon<select value={formation} onChange={(event) => chooseFormation(event.target.value as Formation)} className="ml-2 bg-slate-900 text-sm"><>{formationNames.map((name) => <option key={name}>{name}</option>)}</></select></label><button type="button" onClick={autoSelect} className={secondaryButtonClass}>Velg beste tropp</button><span className="ml-auto text-xs text-white/50">{starters.length}/11 XI · {bench.length}/7 benk</span></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="relative aspect-[.72] overflow-hidden rounded-2xl border border-emerald-200/30 bg-[#0a3d2d] shadow-[inset_0_0_90px_rgba(0,0,0,.7)] sm:aspect-[1.12] xl:aspect-[1.3]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.15) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.12) 2px, transparent 2px), radial-gradient(ellipse at center, transparent 0 23%, rgba(255,255,255,.16) 23.3% 23.7%, transparent 24%), linear-gradient(100deg,#0b563d,#0b3b2d 50%,#075238)" }}><div className="absolute inset-[3%] border-2 border-white/25" /><div className="absolute left-0 right-0 top-1/2 border-t-2 border-white/25" /><div className="absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" /><div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
        {visibleSlots.map((slot, index) => { const card = cardById.get(starters[index]); return card ? <div key={`${slot.position}-${index}`} className="absolute w-[76px] -translate-x-1/2 -translate-y-1/2 sm:w-[108px] xl:w-[124px]" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}><SquadCard card={card} position={slot.position} active={draggedId === card.id} selected={selectedId === card.id} onPointerDown={pointerDown(card.id)} onPointerUp={pointerUp()} onClick={() => setSelectedId(card.id)} /></div> : null; })}</div>
        <aside className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-white">{selected ? <><div className="flex items-start gap-3">{selectedFlag ? <Image src={selectedFlag} alt="" width={48} height={36} unoptimized className="mt-1 h-9 w-12 shrink-0 rounded object-cover shadow ring-1 ring-black/30" /> : null}<div><p className="text-xs font-bold tracking-[.18em] text-cyan-300">SPILLERDETALJER</p><h3 className="mt-1 text-lg font-black">{selected.name}</h3><p className="text-sm text-white/55">{selected.club}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 text-center">{[["OVR", selected.overall], ...Object.entries(selected.attributes).slice(0, 5).map(([key, value]) => [key.slice(0, 3).toUpperCase(), value])].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white/8 p-3"><b className="block text-2xl">{value}</b><span className="text-[10px] font-bold text-white/45">{label}</span></div>)}</div></> : <div className="grid h-full min-h-36 place-items-center text-center text-sm text-white/50">Trykk på et spillerkort for detaljer.</div>}</aside></div>
      <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black tracking-wide">BENK</h3><span className="text-xs text-muted">Dra spillere hit for å bytte</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{bench.map((id) => { const card = cardById.get(id); return card ? <SquadCard key={id} card={card} position={card.position} compact active={draggedId === id} selected={selectedId === id} onPointerDown={pointerDown(id)} onPointerUp={pointerUp()} onClick={() => setSelectedId(id)} /> : null; })}</div></div>
      <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black tracking-wide">RESERVER</h3><span className="text-xs text-muted">{reserves.length} tilgjengelige</span></div>{reserves.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{reserves.map((card) => <SquadCard key={card.id} card={card} position={card.position} compact active={draggedId === card.id} selected={selectedId === card.id} onPointerDown={pointerDown(card.id)} onPointerUp={pointerUp()} onClick={() => setSelectedId(card.id)} />)}</div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">Ingen reserver i troppen.</p>}</div>
      <div className="flex flex-wrap items-center gap-3"><button className={buttonClass} disabled={!canSave}>{pending ? "Lagrer…" : "Lagre ellever"}</button>{!canSave && !pending ? <span className="text-xs text-muted">{starters.length !== 11 || bench.length !== 7 ? "Velg 11 startspillere og 7 på benken." : "Ingen ulagrede endringer."}</span> : null}{notice ? <span className="text-sm text-cyan-300">{notice}</span> : null}{state.error ? <p className="text-sm text-danger">{state.error}</p> : state.ok ? <p className="text-sm text-success">Elleveren er lagret.</p> : null}</div>
    </form></section>;
}

function Storage({ storage, squad }: { storage: ManagerCard[]; squad: ManagerCard[] }) {
  const [moveState, moveAction, movePending] = useActionState(moveManagerCardAction, initial);
  const [swapState, swapAction, swapPending] = useActionState(swapManagerCardsAction, initial);
  const roomInSquad = squad.length < squadCapacity;
  const message = moveState.error ?? swapState.error;
  return <section className={`${cardClass} grid gap-4`}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Klubblageret</h2><p className="text-sm text-muted">{roomInSquad ? "Det er ledig plass i troppen, så du kan sette inn spillere direkte." : "Troppen er full. Velg hvem som må ut for å få en spiller inn."}</p></div>
      <span className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{storage.length} / {storageCapacity}</span>
    </div>
    {storage.length ? <div className="grid gap-2">{storage.map((card) => <div key={card.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
      <div className="grid h-9 w-9 place-items-center rounded bg-accent-soft font-bold">{card.overall}</div>
      <div className="min-w-0 flex-1"><b className="block truncate text-sm">{card.name}</b><span className="text-xs text-muted">{card.position} · {card.club}</span></div>
      {roomInSquad ? <form action={moveAction}><input type="hidden" name="card_id" value={card.id} /><input type="hidden" name="location" value="squad" /><button className={secondaryButtonClass} disabled={movePending}>Sett i troppen</button></form>
        : <form action={swapAction} className="flex items-center gap-2"><input type="hidden" name="storage_card" value={card.id} /><select name="squad_card" className="text-sm" aria-label={`Bytt ${card.name} med`} defaultValue="">{<option value="" disabled>Bytt med…</option>}{squad.map((option) => <option key={option.id} value={option.id}>{option.overall} {option.name}</option>)}</select><button className={secondaryButtonClass} disabled={swapPending}>Bytt</button></form>}
    </div>)}</div> : <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">Lageret er tomt. Kort du ikke får plass til i troppen havner her.</p>}
    {message ? <p className="text-sm text-danger">{message}</p> : null}
  </section>;
}

function Duplicates({ groups }: { groups: ManagerCard[][] }) {
  const [state, action, pending] = useActionState(quickSellManagerCardAction, initial);
  if (groups.length === 0) return null;
  return <section className={`${cardClass} grid gap-4 border-danger/40`}>
    <div><h2 className="text-lg font-semibold">Duplikater må avklares</h2><p className="text-sm text-muted">Du eier samme spiller flere ganger. Legg ett av kortene ut på overgangsmarkedet, eller kast det her. Pakker er stengt til det er gjort.</p></div>
    {groups.map((group) => <div key={group[0].catalog_id} className="grid gap-2 rounded-lg border border-border p-3">
      <b className="text-sm">{group[0].name} · {group.length} eksemplarer</b>
      {group.map((card) => <div key={card.id} className="flex flex-wrap items-center gap-3 text-sm">
        <span className="flex-1 text-muted">{card.overall} {card.position} · {card.location === "squad" ? "i troppen" : "på lageret"} · kjøpt for {card.acquired_price} MB</span>
        <form action={action}><input type="hidden" name="card_id" value={card.id} /><button className={secondaryButtonClass} disabled={pending}>Kast (0 MB)</button></form>
      </div>)}
    </div>)}
    {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
  </section>;
}

export type ManagerCareerSection = "squad" | "storage" | "packs" | "catalog";

export function ManagerCareer({ cards, catalog, lineup, packs, listedCardIds, freePacks = {}, budget, section }: { cards: ManagerCard[]; catalog: CatalogCard[]; lineup: ManagerLineup | null; packs: ManagerPack[]; listedCardIds: string[]; freePacks?: Record<string, number>; budget: number; section: ManagerCareerSection }) {
  const squad = cards.filter((card) => card.location === "squad");
  const storage = cards.filter((card) => card.location === "storage");
  // Et kort som ligger ute for salg teller ikke som duplikat: da er valget allerede tatt.
  const duplicateGroups = useMemo(() => {
    const listed = new Set(listedCardIds);
    const byCatalog = new Map<string, ManagerCard[]>();
    for (const card of cards) {
      if (!card.catalog_id || listed.has(card.id)) continue;
      byCatalog.set(card.catalog_id, [...(byCatalog.get(card.catalog_id) ?? []), card]);
    }
    return [...byCatalog.values()].filter((group) => group.length > 1);
  }, [cards, listedCardIds]);
  if (section === "squad") return <Squad key={lineup?.updated_at ?? "new-lineup"} cards={squad} lineup={lineup} />;
  if (section === "storage") return <Storage storage={storage} squad={squad} />;
  if (section === "packs") return <div className="grid gap-6"><Duplicates groups={duplicateGroups} /><PackStore packs={packs} freePacks={freePacks} budget={budget} blockedByDuplicate={duplicateGroups.length > 0} /></div>;
  return <Catalog catalog={catalog} owned={new Set(cards.map((card) => card.catalog_id).filter((id): id is string => Boolean(id)))} budget={budget} />;
}
