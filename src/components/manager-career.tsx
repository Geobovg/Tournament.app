"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { buyCatalogCardAction, saveManagerLineupAction } from "@/lib/manager-actions";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";

const initial: ActionState = {};
const positionOrder = ["GK", "RB", "CB", "LB", "CDM", "CM", "CAM", "RW", "LW", "ST"];
const statLabels: [string, string][] = [["pace", "FAR"], ["shooting", "SKD"], ["passing", "PAS"], ["dribbling", "DRI"], ["defending", "FOR"], ["physical", "FYS"]];
type ManagerCard = { id: string; catalog_id: string | null; name: string; position: string; overall: number; tradable: boolean; is_starter: boolean; acquired_price: number };
type CatalogCard = { id: string; name: string; position: string; overall: number; price: number; accent: string; attributes: Record<string, number> };
type ManagerLineup = { formation: string; starters: string[]; bench: string[] };

function PlayerCard({ player, owned, budget, action, pending }: { player: CatalogCard; owned: boolean; budget: number; action: (formData: FormData) => void; pending: boolean }) {
  const canBuy = !owned && budget >= player.price;
  return <form action={action} className="group relative min-h-80 overflow-hidden rounded-2xl border border-white/15 p-4 text-white shadow-xl transition hover:-translate-y-1 hover:border-white/40" style={{ background: `radial-gradient(circle at 90% 8%, ${player.accent}bb 0, transparent 31%), linear-gradient(145deg, #08150e 0%, #102b1a 55%, #06110a 100%)` }}>
    <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,.09)_45%,transparent_58%)] opacity-70" />
    <div className="relative flex items-start justify-between"><div><p className="text-xs font-bold tracking-[.28em] text-white/65">MANAGER CARD</p><p className="mt-2 text-sm font-black">{player.position}</p></div><b className="text-5xl font-black tracking-tighter">{player.overall}</b></div>
    <div className="relative mt-10"><div className="grid h-14 w-14 place-items-center rounded-full border-2 border-white/35 bg-black/20 text-2xl">⚽</div><h3 className="mt-4 truncate text-xl font-black uppercase tracking-wide">{player.name}</h3><p className="mt-1 text-xs font-semibold uppercase tracking-[.2em] text-white/65">Original squad edition</p></div>
    <div className="relative mt-5 grid grid-cols-3 gap-x-3 gap-y-2 border-y border-white/15 py-3 text-xs">{statLabels.map(([key, label]) => <div key={key} className="flex justify-between"><span className="text-white/60">{label}</span><b>{player.attributes[key] ?? player.overall}</b></div>)}</div>
    <input type="hidden" name="catalog_id" value={player.id} />
    <div className="relative mt-4 flex items-center justify-between gap-3"><span className="rounded-full bg-black/20 px-3 py-1 text-sm font-bold">{player.price} MB</span><button className={canBuy ? buttonClass : secondaryButtonClass} disabled={!canBuy || pending}>{owned ? "Eies" : budget < player.price ? "For dyr" : "Kjøp kort"}</button></div>
  </form>;
}

function Catalog({ catalog, owned, budget }: { catalog: CatalogCard[]; owned: Set<string>; budget: number }) {
  const [state, action, pending] = useActionState(buyCatalogCardAction, initial);
  const [search, setSearch] = useState(""); const [position, setPosition] = useState("all"); const [minimum, setMinimum] = useState("0"); const [maximumPrice, setMaximumPrice] = useState("999");
  const cards = useMemo(() => catalog.filter((player) => player.name.toLocaleLowerCase("nb-NO").includes(search.trim().toLocaleLowerCase("nb-NO")) && (position === "all" || player.position === position) && player.overall >= Number(minimum) && player.price <= Number(maximumPrice)), [catalog, maximumPrice, minimum, position, search]);
  return <section className={`${cardClass} grid gap-4`}><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-muted">SPILLERMARKED</p><h2 className="mt-1 text-2xl font-bold">Bygg drømmelaget</h2><p className="mt-1 text-sm text-muted">Originale kort med realistisk nivå og pris – helt uten offisielle logoer eller bilder.</p></div><b className="rounded-xl bg-accent-soft px-4 py-3 text-xl text-accent">{budget} MB</b></div>
    <div className="grid gap-2 rounded-xl border border-border bg-surface-raised p-3 sm:grid-cols-4"><label className="text-xs text-muted">Søk<input className="mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Spiller…" /></label><label className="text-xs text-muted">Posisjon<select className="mt-1 w-full" value={position} onChange={(event) => setPosition(event.target.value)}><option value="all">Alle</option>{positionOrder.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs text-muted">Min. rating<select className="mt-1 w-full" value={minimum} onChange={(event) => setMinimum(event.target.value)}>{[0, 70, 75, 80, 85, 90].map((value) => <option key={value} value={value}>{value === 0 ? "Alle" : `${value}+`}</option>)}</select></label><label className="text-xs text-muted">Maks pris<select className="mt-1 w-full" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)}>{[[999, "Alle"], [20, "20 MB"], [50, "50 MB"], [100, "100 MB"], [150, "150 MB"], [200, "200 MB"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
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
