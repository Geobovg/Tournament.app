"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/actions";
import type { ManagerCard, ManagerLineup, ManagerPack, CatalogCard } from "@/lib/career";
import { squadCapacity, storageCapacity } from "@/lib/manager-limits";
import { buyCatalogCardAction, moveManagerCardAction, quickSellManagerCardAction, saveManagerLineupAction, swapManagerCardsAction } from "@/lib/manager-actions";
import { PackStore } from "./pack-store";
import { PlayerCardFace } from "./player-card-face";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";

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

function Squad({ cards, lineup }: { cards: ManagerCard[]; lineup: ManagerLineup | null }) {
  const [state, action, pending] = useActionState(saveManagerLineupAction, initial);
  const starters = new Set(lineup?.starters ?? cards.slice(0, 11).map((card) => card.id));
  const bench = new Set(lineup?.bench ?? []);
  return <section className={`${cardClass} grid gap-4`}><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Troppen min</h2><p className="text-sm text-muted">Velg nøyaktig 11 startspillere og opptil 7 på benken. Resten er reserver.</p></div><span className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{cards.length} / {squadCapacity}</span></div><form action={action} className="grid gap-2"><label className="max-w-xs text-sm text-muted">Formasjon<select name="formation" defaultValue={lineup?.formation ?? "4-3-3"} className="ml-2"><option>4-3-3</option><option>4-2-3-1</option><option>4-4-2</option><option>3-5-2</option><option>4-3-1-2</option></select></label><div className="grid gap-2 sm:grid-cols-2">{cards.map((card) => <div key={card.id} className="flex items-center gap-3 rounded-lg border border-border p-3"><div className="grid h-9 w-9 place-items-center rounded bg-accent-soft font-bold">{card.overall}</div><div className="min-w-0 flex-1"><b className="block truncate text-sm">{card.name}</b><span className="text-xs text-muted">{card.position}{card.is_starter ? " · Academy" : ""}</span></div><label className="text-xs"><input name="starter_ids" type="checkbox" value={card.id} defaultChecked={starters.has(card.id)} /> XI</label><label className="text-xs"><input name="bench_ids" type="checkbox" value={card.id} defaultChecked={bench.has(card.id)} /> Benk</label></div>)}</div><div><button className={buttonClass} disabled={pending}>{pending ? "Lagrer…" : "Lagre ellever"}</button>{state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : state.ok ? <p className="mt-2 text-sm text-success">Elleveren er lagret.</p> : null}</div></form></section>;
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

export function ManagerCareer({ cards, catalog, lineup, packs, listedCardIds, budget }: { cards: ManagerCard[]; catalog: CatalogCard[]; lineup: ManagerLineup | null; packs: ManagerPack[]; listedCardIds: string[]; budget: number }) {
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
  return <div className="grid gap-6">
    <Duplicates groups={duplicateGroups} />
    <PackStore packs={packs} budget={budget} blockedByDuplicate={duplicateGroups.length > 0} />
    <Squad cards={squad} lineup={lineup} />
    <Storage storage={storage} squad={squad} />
    <Catalog catalog={catalog} owned={new Set(cards.map((card) => card.catalog_id).filter((id): id is string => Boolean(id)))} budget={budget} />
  </div>;
}
