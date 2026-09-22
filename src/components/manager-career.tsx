"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { clubCrest } from "@/lib/club-crests";
import { playerPhoto } from "@/lib/player-photos";
import { buyCatalogCardAction, saveManagerLineupAction } from "@/lib/manager-actions";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";

const initial: ActionState = {};
const positionOrder = ["GK", "RB", "CB", "LB", "CDM", "CM", "CAM", "RW", "LW", "ST"];
const statLabels: [string, string][] = [["pace", "FAR"], ["shooting", "SKD"], ["passing", "PAS"], ["dribbling", "DRI"], ["defending", "FOR"], ["physical", "FYS"]];
type ManagerCard = { id: string; catalog_id: string | null; name: string; position: string; overall: number; tradable: boolean; is_starter: boolean; acquired_price: number };
type CatalogCard = { id: string; slug: string; name: string; position: string; overall: number; price: number; accent: string; club: string; attributes: Record<string, number> };
type ManagerLineup = { formation: string; starters: string[]; bench: string[] };

function PlayerCard({ player, owned, budget, action, pending }: { player: CatalogCard; owned: boolean; budget: number; action: (formData: FormData) => void; pending: boolean }) {
  const canBuy = !owned && budget >= player.price;
  const crest = clubCrest(player.club);
  const photo = playerPhoto(player.slug);
  return <form action={action} className="group relative flex min-h-[27rem] flex-col overflow-hidden rounded-2xl border border-white/15 p-4 text-white shadow-xl transition hover:-translate-y-1 hover:border-white/40" style={{ background: `radial-gradient(circle at 90% 8%, ${player.accent}bb 0, transparent 31%), linear-gradient(145deg, #08150e 0%, #102b1a 55%, #06110a 100%)` }}>
    <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,.09)_45%,transparent_58%)] opacity-70" />
    <p className="relative text-xs font-bold tracking-[.28em] text-white/65">MANAGER CARD</p>
    <div className="relative mt-2 h-44">
      {photo ? <Image src={photo} alt="" width={256} height={256} className="absolute bottom-0 left-1/2 h-44 w-44 -translate-x-1/2 object-contain object-bottom drop-shadow-[0_10px_18px_rgba(0,0,0,.55)]" /> : <div className="absolute bottom-0 left-1/2 grid h-28 w-28 -translate-x-1/2 place-items-center rounded-full border-2 border-white/35 bg-black/20 text-4xl">⚽</div>}
      <div className="absolute left-0 top-1 grid w-14 justify-items-center gap-1"><b className="text-5xl font-black leading-none tracking-tighter">{player.overall}</b><p className="text-sm font-black tracking-wide">{player.position}</p>{crest ? <span className="mt-1 grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-white/35 bg-white/95"><Image src={crest} alt="" width={24} height={24} className="h-6 w-6 object-contain" /></span> : null}</div>
    </div>
    <div className="relative border-t border-white/25 pt-2 text-center"><h3 className="truncate text-xl font-black uppercase tracking-wide">{player.name}</h3><p className="mt-1 truncate text-xs font-semibold uppercase tracking-[.2em] text-white/65">{player.club}</p></div>
    <div className="relative mt-3 grid grid-cols-3 gap-x-3 gap-y-2 border-y border-white/15 py-3 text-xs">{statLabels.map(([key, label]) => <div key={key} className="flex justify-between"><span className="text-white/60">{label}</span><b>{player.attributes[key] ?? player.overall}</b></div>)}</div>
    <input type="hidden" name="catalog_id" value={player.id} />
    <div className="relative mt-auto flex items-center justify-between gap-3 pt-4"><span className="rounded-full bg-black/20 px-3 py-1 text-sm font-bold">{player.price} MB</span><button className={canBuy ? buttonClass : secondaryButtonClass} disabled={!canBuy || pending}>{owned ? "Eies" : budget < player.price ? "For dyr" : "Kjøp kort"}</button></div>
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
    {state.error ? <p className="text-sm text-danger">{state.error}</p> : state.ok ? <p className="text-sm text-success">Spilleren er lagt til i troppen.</p> : null}
  </section>;
}

function Squad({ cards, lineup }: { cards: ManagerCard[]; lineup: ManagerLineup | null }) {
  const [state, action, pending] = useActionState(saveManagerLineupAction, initial);
  const starters = new Set(lineup?.starters ?? cards.slice(0, 11).map((card) => card.id));
  const bench = new Set(lineup?.bench ?? []);
  return <section className={`${cardClass} grid gap-4`}><div><h2 className="text-lg font-semibold">Min ellever</h2><p className="text-sm text-muted">Velg nøyaktig 11 startspillere og opptil 7 på benken.</p></div><form action={action} className="grid gap-2"><label className="max-w-xs text-sm text-muted">Formasjon<select name="formation" defaultValue={lineup?.formation ?? "4-3-3"} className="ml-2"><option>4-3-3</option><option>4-2-3-1</option><option>4-4-2</option><option>3-5-2</option><option>4-3-1-2</option></select></label><div className="grid gap-2 sm:grid-cols-2">{cards.map((card) => <div key={card.id} className="flex items-center gap-3 rounded-lg border border-border p-3"><div className="grid h-9 w-9 place-items-center rounded bg-accent-soft font-bold">{card.overall}</div><div className="min-w-0 flex-1"><b className="block truncate text-sm">{card.name}</b><span className="text-xs text-muted">{card.position}{card.is_starter ? " · Academy" : ""}</span></div><label className="text-xs"><input name="starter_ids" type="checkbox" value={card.id} defaultChecked={starters.has(card.id)} /> XI</label><label className="text-xs"><input name="bench_ids" type="checkbox" value={card.id} defaultChecked={bench.has(card.id)} /> Benk</label></div>)}</div><div><button className={buttonClass} disabled={pending}>{pending ? "Lagrer…" : "Lagre ellever"}</button>{state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : state.ok ? <p className="mt-2 text-sm text-success">Elleveren er lagret.</p> : null}</div></form></section>;
}

export function ManagerCareer({ cards, catalog, lineup, budget }: { cards: ManagerCard[]; catalog: CatalogCard[]; lineup: ManagerLineup | null; budget: number }) {
  return <div className="grid gap-6"><Squad cards={cards} lineup={lineup}/><Catalog catalog={catalog} owned={new Set(cards.map((card) => card.catalog_id).filter((id): id is string => Boolean(id)))} budget={budget}/></div>;
}
