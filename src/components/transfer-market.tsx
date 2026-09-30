"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/actions";
import type { ManagerCard, MarketListing } from "@/lib/career";
import { marketListingLimit, marketPriceRange } from "@/lib/manager-limits";
import { buyNowMarketAction, createMarketListingAction, placeMarketBidAction } from "@/lib/market-actions";
import { useLocale, useT } from "@/i18n/client";
import { INTL_LOCALES } from "@/i18n/locales";
import type { Dictionary } from "@/i18n/dictionaries";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";

const initial: ActionState = {};
const positionOrder = ["GK", "RB", "CB", "LB", "CDM", "CM", "CAM", "RW", "LW", "ST"];

function timeLeft(endsAt: string, t: Dictionary) {
  const minutes = Math.max(0, Math.round((new Date(endsAt).getTime() - Date.now()) / 60000));
  return t.market.transfer.timeLeft(Math.floor(minutes / 60), minutes % 60);
}

// Ett skjema for alle kortene: prisgrensen følger kortet som er valgt.
function ListCardForm({ cards, values, activeCount }: { cards: ManagerCard[]; values: Map<string, number>; activeCount: number }) {
  const t = useT();
  const tm = t.market.transfer;
  const [state, action, pending] = useActionState(createMarketListingAction, initial);
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const card = cards.find((item) => item.id === cardId) ?? cards[0];
  const value = card?.catalog_id ? values.get(card.catalog_id) ?? 0 : 0;
  const { min, max } = marketPriceRange(value);
  const full = activeCount >= marketListingLimit;
  if (!card) return <p className="text-sm text-muted">{tm.noSellableCards}</p>;
  return <form key={card.id} action={action} className="grid gap-3 rounded-xl border border-border bg-surface-raised p-3">
    <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
      <label className="text-xs text-muted">{tm.card}<select className="mt-1 w-full" name="card_id" value={card.id} onChange={(event) => setCardId(event.target.value)}>{cards.map((item) => <option key={item.id} value={item.id}>{item.overall} {item.position} · {item.name}</option>)}</select></label>
      <label className="text-xs text-muted">{tm.startPrice}<input className="mt-1 w-full" name="start_price" type="number" min={min} max={max} defaultValue={value || min} /></label>
      <label className="text-xs text-muted">{tm.buyNow}<input className="mt-1 w-full" name="buy_now_price" type="number" min={min} max={max} defaultValue={Math.min(max, value * 2) || max} /></label>
      <label className="text-xs text-muted">{tm.duration}<select className="mt-1 w-full" name="duration_hours" defaultValue="24">{[1, 6, 24].map((hours) => <option key={hours} value={hours}>{tm.durationHours(hours)}</option>)}</select></label>
      <button className={buttonClass} disabled={pending || full}>{tm.listCard}</button>
    </div>
    <p className="text-xs text-muted">{tm.priceInfo(value, min, max)}</p>
    {full ? <p className="text-sm text-danger">{tm.listingLimitReached(marketListingLimit)}</p> : null}
    {state.error ? <p className="text-sm text-danger">{state.error}</p> : state.ok ? <p className="text-sm text-success">{tm.listed}</p> : null}
  </form>;
}

function ListingCard({ listing, budget, own }: { listing: MarketListing; budget: number; own: boolean }) {
  const t = useT();
  const tm = t.market.transfer;
  const [bidState, bidAction, bidding] = useActionState(placeMarketBidAction, initial);
  const [buyState, buyAction, buying] = useActionState(buyNowMarketAction, initial);
  const minimum = Math.max(listing.starting_price, (listing.highest_bid ?? 0) + 1);
  return <article className="rounded-xl border border-border bg-surface-raised p-4">
    <div className="flex justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-muted">{listing.card.position}{listing.card.club ? ` · ${listing.card.club}` : ""}</p><h3 className="truncate font-bold">{listing.card.name}</h3><p className="text-sm text-muted">{own ? tm.yourListing : tm.from(listing.seller_name)} · <span suppressHydrationWarning>{timeLeft(listing.ends_at, t)}</span> {tm.left}</p></div><b className="text-3xl">{listing.card.overall}</b></div>
    <p className="mt-3 text-sm">{tm.highestBid} <b>{listing.highest_bid ?? tm.noBids}</b> · {tm.buyNow}: <b className="text-accent">{listing.buy_now_price} MB</b></p>
    {own ? null : <div className="mt-3 flex gap-2"><form action={bidAction} className="flex min-w-0 flex-1 gap-2"><input type="hidden" name="listing_id" value={listing.id} /><input className="w-full min-w-0" name="amount" type="number" min={minimum} defaultValue={minimum} aria-label={tm.bid} /><button className={secondaryButtonClass} disabled={bidding || budget < minimum || minimum >= listing.buy_now_price}>{tm.placeBid}</button></form><form action={buyAction}><input type="hidden" name="listing_id" value={listing.id} /><button className={buttonClass} disabled={buying || budget < listing.buy_now_price}>{tm.buyNow}</button></form></div>}
    {bidState.error || buyState.error ? <p className="mt-2 text-sm text-danger">{bidState.error ?? buyState.error}</p> : bidState.ok ? <p className="mt-2 text-sm text-success">{tm.bidPlaced}</p> : buyState.ok ? <p className="mt-2 text-sm text-success">{tm.bought}</p> : null}
  </article>;
}

export function TransferMarket({ cards, listings, userId, budget }: { cards: ManagerCard[]; listings: MarketListing[]; userId: string; budget: number }) {
  const tm = useT().market.transfer;
  const locale = useLocale(); const intl = INTL_LOCALES[locale];
  const values = useMemo(() => new Map(cards.flatMap((card) => card.catalog_id ? [[card.catalog_id, card.value] as const] : [])), [cards]);
  const own = listings.filter((listing) => listing.seller_id === userId);
  const listedIds = new Set(own.map((listing) => listing.card_id));
  const sellable = cards.filter((card) => card.tradable && !listedIds.has(card.id));
  const others = listings.filter((listing) => listing.seller_id !== userId);

  const [search, setSearch] = useState(""); const [position, setPosition] = useState("all"); const [minimum, setMinimum] = useState("0");
  const [club, setClub] = useState("all"); const [maximumPrice, setMaximumPrice] = useState(""); const [sort, setSort] = useState("ending");
  const clubOptions = useMemo(() => [...new Set(others.map((listing) => listing.card.club).filter(Boolean))].sort((first, second) => first.localeCompare(second, intl)), [intl, others]);
  const parsedPrice = Number(maximumPrice); const priceLimit = maximumPrice.trim() === "" || !Number.isFinite(parsedPrice) ? Infinity : parsedPrice;
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(intl);
    const matches = others.filter((listing) => listing.card.name.toLocaleLowerCase(intl).includes(needle) && (position === "all" || listing.card.position === position) && listing.card.overall >= Number(minimum) && (club === "all" || listing.card.club === club) && listing.buy_now_price <= priceLimit);
    if (sort === "price-asc") return matches.sort((first, second) => first.buy_now_price - second.buy_now_price);
    if (sort === "price-desc") return matches.sort((first, second) => second.buy_now_price - first.buy_now_price);
    if (sort === "overall") return matches.sort((first, second) => second.card.overall - first.card.overall);
    return matches.sort((first, second) => first.ends_at.localeCompare(second.ends_at));
  }, [club, intl, minimum, others, position, priceLimit, search, sort]);

  return <section className={`${cardClass} grid gap-5`}>
    <div><h2 className="text-lg font-semibold">{tm.title}</h2><p className="text-sm text-muted">{tm.intro}</p></div>
    <div className="grid gap-2"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold uppercase text-muted">{tm.listOwnCard}</h3><span className="text-xs text-muted">{tm.activeCount(own.length, marketListingLimit)}</span></div><ListCardForm cards={sellable} values={values} activeCount={own.length} /></div>
    {own.length ? <div className="grid gap-3"><h3 className="text-sm font-bold uppercase text-muted">{tm.yourListings}</h3><div className="grid gap-3 sm:grid-cols-2">{own.map((listing) => <ListingCard key={listing.id} listing={listing} budget={budget} own />)}</div></div> : null}
    <div className="grid gap-3"><h3 className="text-sm font-bold uppercase text-muted">{tm.forSale}</h3>
      <div className="grid gap-2 rounded-xl border border-border bg-surface-raised p-3 sm:grid-cols-3 lg:grid-cols-6 sm:items-end">
        <label className="text-xs text-muted sm:col-span-2 lg:col-span-1">{tm.search}<input className="mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tm.searchPlaceholder} /></label>
        <label className="text-xs text-muted">{tm.position}<select className="mt-1 w-full" value={position} onChange={(event) => setPosition(event.target.value)}><option value="all">{tm.all}</option>{positionOrder.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs text-muted">{tm.minRating}<select className="mt-1 w-full" value={minimum} onChange={(event) => setMinimum(event.target.value)}>{[0, 75, 80, 84, 86, 88, 90].map((value) => <option key={value} value={value}>{value === 0 ? tm.all : `${value}+`}</option>)}</select></label>
        <label className="text-xs text-muted">{tm.club}<select className="mt-1 w-full" value={club} onChange={(event) => setClub(event.target.value)}><option value="all">{tm.all}</option>{clubOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs text-muted">{tm.maxPrice}<input className="mt-1 w-full" type="number" min="0" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} placeholder="MB" /></label>
        <label className="text-xs text-muted">{tm.sort}<select className="mt-1 w-full" value={sort} onChange={(event) => setSort(event.target.value)}><option value="ending">{tm.sortEnding}</option><option value="price-asc">{tm.sortPriceAsc}</option><option value="price-desc">{tm.sortPriceDesc}</option><option value="overall">{tm.sortOverall}</option></select></label>
      </div>
      <p className="text-sm text-muted">{tm.showing(visible.length, others.length)}</p>
      {visible.length ? <div className="grid gap-3 sm:grid-cols-2">{visible.map((listing) => <ListingCard key={listing.id} listing={listing} budget={budget} own={false} />)}</div> : <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">{others.length ? tm.noMatches : tm.noListings}</p>}
    </div>
  </section>;
}
