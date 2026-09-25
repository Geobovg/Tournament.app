"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/actions";
import type { CatalogCard, ManagerCard, MarketListing } from "@/lib/career";
import { marketListingLimit, marketPriceRange } from "@/lib/manager-limits";
import { buyNowMarketAction, createMarketListingAction, placeMarketBidAction } from "@/lib/market-actions";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";

const initial: ActionState = {};
const positionOrder = ["GK", "RB", "CB", "LB", "CDM", "CM", "CAM", "RW", "LW", "ST"];

function timeLeft(endsAt: string) {
  const minutes = Math.max(0, Math.round((new Date(endsAt).getTime() - Date.now()) / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} t ${minutes % 60} min` : `${minutes} min`;
}

// Ett skjema for alle kortene: prisgrensen følger kortet som er valgt.
function ListCardForm({ cards, values, activeCount }: { cards: ManagerCard[]; values: Map<string, number>; activeCount: number }) {
  const [state, action, pending] = useActionState(createMarketListingAction, initial);
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const card = cards.find((item) => item.id === cardId) ?? cards[0];
  const value = card?.catalog_id ? values.get(card.catalog_id) ?? 0 : 0;
  const { min, max } = marketPriceRange(value);
  const full = activeCount >= marketListingLimit;
  if (!card) return <p className="text-sm text-muted">Du har ingen kort som kan selges. Academy-kort kan ikke legges ut.</p>;
  return <form key={card.id} action={action} className="grid gap-3 rounded-xl border border-border bg-surface-raised p-3">
    <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
      <label className="text-xs text-muted">Kort<select className="mt-1 w-full" name="card_id" value={card.id} onChange={(event) => setCardId(event.target.value)}>{cards.map((item) => <option key={item.id} value={item.id}>{item.overall} {item.position} · {item.name}</option>)}</select></label>
      <label className="text-xs text-muted">Startpris<input className="mt-1 w-full" name="start_price" type="number" min={min} max={max} defaultValue={value || min} /></label>
      <label className="text-xs text-muted">Kjøp nå<input className="mt-1 w-full" name="buy_now_price" type="number" min={min} max={max} defaultValue={Math.min(max, value * 2) || max} /></label>
      <label className="text-xs text-muted">Varighet<select className="mt-1 w-full" name="duration_hours" defaultValue="24"><option value="1">1 time</option><option value="6">6 timer</option><option value="24">24 timer</option></select></label>
      <button className={buttonClass} disabled={pending || full}>Legg ut</button>
    </div>
    <p className="text-xs text-muted">Verdi {value} MB · tillatt pris {min}–{max} MB · du får 95 % av salgssummen.</p>
    {full ? <p className="text-sm text-danger">Du har {marketListingLimit} kort ute. Vent til ett er solgt eller utløpt.</p> : null}
    {state.error ? <p className="text-sm text-danger">{state.error}</p> : state.ok ? <p className="text-sm text-success">Kortet ligger ute for alle managere.</p> : null}
  </form>;
}

function ListingCard({ listing, budget, own }: { listing: MarketListing; budget: number; own: boolean }) {
  const [bidState, bidAction, bidding] = useActionState(placeMarketBidAction, initial);
  const [buyState, buyAction, buying] = useActionState(buyNowMarketAction, initial);
  const minimum = Math.max(listing.starting_price, (listing.highest_bid ?? 0) + 1);
  return <article className="rounded-xl border border-border bg-surface-raised p-4">
    <div className="flex justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-muted">{listing.card.position}{listing.card.club ? ` · ${listing.card.club}` : ""}</p><h3 className="truncate font-bold">{listing.card.name}</h3><p className="text-sm text-muted">{own ? "Din annonse" : `Fra ${listing.seller_name}`} · <span suppressHydrationWarning>{timeLeft(listing.ends_at)}</span> igjen</p></div><b className="text-3xl">{listing.card.overall}</b></div>
    <p className="mt-3 text-sm">Høyeste bud: <b>{listing.highest_bid ?? "Ingen"}</b> · Kjøp nå: <b className="text-accent">{listing.buy_now_price} MB</b></p>
    {own ? null : <div className="mt-3 flex gap-2"><form action={bidAction} className="flex min-w-0 flex-1 gap-2"><input type="hidden" name="listing_id" value={listing.id} /><input className="w-full min-w-0" name="amount" type="number" min={minimum} defaultValue={minimum} aria-label="Bud" /><button className={secondaryButtonClass} disabled={bidding || budget < minimum || minimum >= listing.buy_now_price}>By</button></form><form action={buyAction}><input type="hidden" name="listing_id" value={listing.id} /><button className={buttonClass} disabled={buying || budget < listing.buy_now_price}>Kjøp nå</button></form></div>}
    {bidState.error || buyState.error ? <p className="mt-2 text-sm text-danger">{bidState.error ?? buyState.error}</p> : bidState.ok ? <p className="mt-2 text-sm text-success">Budet ditt er registrert.</p> : buyState.ok ? <p className="mt-2 text-sm text-success">Kortet er ditt!</p> : null}
  </article>;
}

export function TransferMarket({ cards, catalog, listings, userId, budget }: { cards: ManagerCard[]; catalog: CatalogCard[]; listings: MarketListing[]; userId: string; budget: number }) {
  const values = useMemo(() => new Map(catalog.map((player) => [player.id, player.price])), [catalog]);
  const own = listings.filter((listing) => listing.seller_id === userId);
  const listedIds = new Set(own.map((listing) => listing.card_id));
  const sellable = cards.filter((card) => card.tradable && !listedIds.has(card.id));
  const others = listings.filter((listing) => listing.seller_id !== userId);

  const [search, setSearch] = useState(""); const [position, setPosition] = useState("all"); const [minimum, setMinimum] = useState("0");
  const [club, setClub] = useState("all"); const [maximumPrice, setMaximumPrice] = useState(""); const [sort, setSort] = useState("ending");
  const clubOptions = useMemo(() => [...new Set(others.map((listing) => listing.card.club).filter(Boolean))].sort((first, second) => first.localeCompare(second, "nb-NO")), [others]);
  const parsedPrice = Number(maximumPrice); const priceLimit = maximumPrice.trim() === "" || !Number.isFinite(parsedPrice) ? Infinity : parsedPrice;
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("nb-NO");
    const matches = others.filter((listing) => listing.card.name.toLocaleLowerCase("nb-NO").includes(needle) && (position === "all" || listing.card.position === position) && listing.card.overall >= Number(minimum) && (club === "all" || listing.card.club === club) && listing.buy_now_price <= priceLimit);
    if (sort === "price-asc") return matches.sort((first, second) => first.buy_now_price - second.buy_now_price);
    if (sort === "price-desc") return matches.sort((first, second) => second.buy_now_price - first.buy_now_price);
    if (sort === "overall") return matches.sort((first, second) => second.card.overall - first.card.overall);
    return matches.sort((first, second) => first.ends_at.localeCompare(second.ends_at));
  }, [club, minimum, others, position, priceLimit, search, sort]);

  return <section className={`${cardClass} grid gap-5`}>
    <div><h2 className="text-lg font-semibold">Overgangsmarked</h2><p className="text-sm text-muted">Alle managere kan se, by på og kjøpe kortene som ligger ute. Den første som kjøper, får kortet.</p></div>
    <div className="grid gap-2"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold uppercase text-muted">Legg ut eget kort</h3><span className="text-xs text-muted">{own.length} / {marketListingLimit} ute</span></div><ListCardForm cards={sellable} values={values} activeCount={own.length} /></div>
    {own.length ? <div className="grid gap-3"><h3 className="text-sm font-bold uppercase text-muted">Dine annonser</h3><div className="grid gap-3 sm:grid-cols-2">{own.map((listing) => <ListingCard key={listing.id} listing={listing} budget={budget} own />)}</div></div> : null}
    <div className="grid gap-3"><h3 className="text-sm font-bold uppercase text-muted">Til salgs</h3>
      <div className="grid gap-2 rounded-xl border border-border bg-surface-raised p-3 sm:grid-cols-3 lg:grid-cols-6 sm:items-end">
        <label className="text-xs text-muted sm:col-span-2 lg:col-span-1">Søk<input className="mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Spiller…" /></label>
        <label className="text-xs text-muted">Posisjon<select className="mt-1 w-full" value={position} onChange={(event) => setPosition(event.target.value)}><option value="all">Alle</option>{positionOrder.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs text-muted">Min. rating<select className="mt-1 w-full" value={minimum} onChange={(event) => setMinimum(event.target.value)}>{[0, 75, 80, 84, 86, 88, 90].map((value) => <option key={value} value={value}>{value === 0 ? "Alle" : `${value}+`}</option>)}</select></label>
        <label className="text-xs text-muted">Klubb<select className="mt-1 w-full" value={club} onChange={(event) => setClub(event.target.value)}><option value="all">Alle</option>{clubOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs text-muted">Maks pris<input className="mt-1 w-full" type="number" min="0" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} placeholder="MB" /></label>
        <label className="text-xs text-muted">Sorter<select className="mt-1 w-full" value={sort} onChange={(event) => setSort(event.target.value)}><option value="ending">Slutter snart</option><option value="price-asc">Pris (lav–høy)</option><option value="price-desc">Pris (høy–lav)</option><option value="overall">Rating (høy–lav)</option></select></label>
      </div>
      <p className="text-sm text-muted">Viser {visible.length} av {others.length} annonser.</p>
      {visible.length ? <div className="grid gap-3 sm:grid-cols-2">{visible.map((listing) => <ListingCard key={listing.id} listing={listing} budget={budget} own={false} />)}</div> : <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">{others.length ? "Ingen annonser passer filtrene." : "Ingen andre managere har lagt ut kort ennå."}</p>}
    </div>
  </section>;
}
