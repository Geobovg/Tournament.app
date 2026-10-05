"use client";

import Image from "next/image";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useT } from "@/i18n/client";
import { INTL_LOCALES } from "@/i18n/locales";
import type { ActionState } from "@/lib/actions";
import type { ManagerCard, ManagerLineup, ManagerPack, CatalogCard, PackShop } from "@/lib/career";
import { specialStyles } from "@/lib/special-cards";
import { defaultCatalogFilters, type CatalogFilters } from "@/lib/catalog-filters";
import { catalogBuyMaxOverall, quickSellValue, squadCapacity } from "@/lib/manager-limits";
import { autoPickBestSquadAction, buyCatalogCardAction, loadCatalogClubsAction, loadCatalogPageAction, moveManagerCardAction, quickSellManagerCardAction, saveManagerLineupAction, swapManagerCardsAction } from "@/lib/manager-actions";
import { PackStore } from "./pack-store";
import { PlayerCardFace } from "./player-card-face";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";
import { clubCrest } from "@/lib/club-crests";
import { anyPosition, formationNames, formations, type Formation, canPlayPosition, pickBestLineup, rearrangeLineup } from "@/lib/lineup";
import { playerFlag } from "@/lib/player-nationalities";
import { playerPhoto } from "@/lib/player-photos";
import { PitchMarkings, slotPoint } from "./squad-pitch";
import { ConfirmDialog } from "./confirm-dialog";
import { useScrollLock } from "./use-scroll-lock";

const initial: ActionState = {};
const benchCardClass = "w-[96px] sm:w-[118px]";
const positionOrder = ["GK", "RB", "CB", "LB", "CDM", "CM", "CAM", "RW", "LW", "ST"];
// Personlige kort har posisjonen «ALL». Den vises på brukerens språk.
function usePositionLabel() {
  const anyLabel = useT().career.special.anyPosition;
  return (position: string) => (position === anyPosition ? anyLabel : position);
}

function PlayerCard({ player, owned, budget, action, pending }: { player: CatalogCard; owned: boolean; budget: number; action: (formData: FormData) => void; pending: boolean }) {
  const canBuy = !owned && budget >= player.price;
  const text = useT().career.catalog;
  return <form action={action}>
    <PlayerCardFace player={player} className="group transition hover:-translate-y-1 hover:border-white/40" footer={<>
      <input type="hidden" name="catalog_id" value={player.id} />
      <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-black/20 px-3 py-1 text-sm font-bold">{player.price} MB</span><button className={canBuy ? buttonClass : secondaryButtonClass} disabled={!canBuy || pending}>{owned ? text.owned : budget < player.price ? text.tooExpensive : text.buy}</button></div>
    </>} />
  </form>;
}

function Catalog({ initialPage, owned, budget }: { initialPage: { cards: CatalogCard[]; total: number }; owned: Set<string>; budget: number }) {
  const [state, action, pending] = useActionState(buyCatalogCardAction, initial);
  const t = useT(); const text = t.career.catalog; const filterText = t.career.filters; const clubName = t.career.clubName;
  const locale = useLocale();
  const [search, setSearch] = useState(""); const [sort, setSort] = useState<CatalogFilters["sort"]>("overall"); const [filtersOpen, setFiltersOpen] = useState(false);
  const [position, setPosition] = useState("all"); const [minimum, setMinimum] = useState("0"); const [maximumPrice, setMaximumPrice] = useState(""); const [clubs, setClubs] = useState<string[]>([]); const [clubSearch, setClubSearch] = useState("");
  // Serveren søker og filtrerer, så her ligger bare kortene som er hentet så langt.
  const [page, setPage] = useState(initialPage); const [loading, setLoading] = useState(false); const [loadError, setLoadError] = useState("");
  const [clubOptions, setClubOptions] = useState<string[] | null>(null); const clubsRequested = useRef(false);
  const request = useRef(0); const loadedKey = useRef(JSON.stringify(defaultCatalogFilters));
  const visibleClubs = useMemo(() => { const options = clubOptions ?? []; const intl = INTL_LOCALES[locale]; const needle = clubSearch.trim().toLocaleLowerCase(intl); return needle ? options.filter((club) => club.toLocaleLowerCase(intl).includes(needle) || clubName(club).toLocaleLowerCase(intl).includes(needle)) : options; }, [clubName, clubOptions, clubSearch, locale]);
  const parsedPrice = Number(maximumPrice); const priceLimit = maximumPrice.trim() === "" || !Number.isFinite(parsedPrice) ? null : parsedPrice;
  const activeFilters = (position === "all" ? 0 : 1) + (minimum === "0" ? 0 : 1) + (priceLimit !== null ? 1 : 0) + (clubs.length ? 1 : 0);
  const filters = useMemo<CatalogFilters>(() => ({ search: search.trim(), position, minimum: Number(minimum), maximumPrice: priceLimit, clubs, sort }), [clubs, minimum, position, priceLimit, search, sort]);
  const load = useCallback(async (next: CatalogFilters, offset: number) => {
    const id = ++request.current; setLoading(true); setLoadError("");
    try {
      const result = await loadCatalogPageAction(next, offset);
      if (id === request.current) setPage((current) => offset ? { cards: [...current.cards, ...result.cards], total: result.total } : result);
    } catch {
      if (id === request.current) setLoadError(text.loadError);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [text.loadError]);
  // Venter litt etter siste tastetrykk, så et søk ikke blir én spørring per bokstav.
  useEffect(() => {
    const key = JSON.stringify(filters);
    if (key === loadedKey.current) return;
    const timer = setTimeout(() => { loadedKey.current = key; void load(filters, 0); }, 250);
    return () => clearTimeout(timer);
  }, [filters, load]);
  const toggleFilters = () => {
    setFiltersOpen((open) => !open);
    if (clubsRequested.current) return;
    clubsRequested.current = true;
    loadCatalogClubsAction().then(setClubOptions, () => { clubsRequested.current = false; setClubOptions([]); });
  };
  const toggleClub = (club: string) => setClubs((current) => current.includes(club) ? current.filter((item) => item !== club) : [...current, club]);
  const resetFilters = () => { setPosition("all"); setMinimum("0"); setMaximumPrice(""); setClubs([]); setClubSearch(""); };
  return <section className={`${cardClass} grid gap-4`}><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-muted">{text.eyebrow}</p><h2 className="mt-1 text-2xl font-bold">{text.heading}</h2><p className="mt-1 text-sm text-muted">{text.intro(catalogBuyMaxOverall)}</p></div><b className="rounded-xl bg-accent-soft px-4 py-3 text-xl text-accent">{budget} MB</b></div>
    <div className="grid gap-2 rounded-xl border border-border bg-surface-raised p-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"><label className="text-xs text-muted">{filterText.search}<input className="mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.playerPlaceholder} /></label><label className="text-xs text-muted">{filterText.sort}<select className="mt-1 w-full" value={sort} onChange={(event) => setSort(event.target.value as CatalogFilters["sort"])}><option value="overall">{filterText.ratingHighLow}</option><option value="price-asc">{filterText.priceLowHigh}</option><option value="price-desc">{filterText.priceHighLow}</option></select></label><button type="button" onClick={toggleFilters} aria-expanded={filtersOpen} className={secondaryButtonClass}>{filtersOpen ? text.hideFilters : text.showFilters}{activeFilters ? ` (${activeFilters})` : ""}</button></div>
    {filtersOpen ? <div className="grid gap-3 rounded-xl border border-border bg-surface-raised p-3">
      <div className="grid gap-2 sm:grid-cols-3"><label className="text-xs text-muted">{filterText.position}<select className="mt-1 w-full" value={position} onChange={(event) => setPosition(event.target.value)}><option value="all">{filterText.all}</option>{positionOrder.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs text-muted">{text.minRating}<select className="mt-1 w-full" value={minimum} onChange={(event) => setMinimum(event.target.value)}>{[0, 70, 75, 80].map((value) => <option key={value} value={value}>{value === 0 ? filterText.all : `${value}+`}</option>)}</select></label><label className="text-xs text-muted">{text.maxPrice}<input className="mt-1 w-full" type="number" min="0" step="5" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} placeholder={text.noLimit} /></label></div>
      <div className="grid gap-2"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">{clubs.length ? text.clubsSelected(clubs.length) : text.clubsAll}</p><div className="flex gap-3 text-xs">{clubs.length ? <button type="button" className="underline" onClick={() => setClubs([])}>{text.clearClubs}</button> : null}{activeFilters ? <button type="button" className="underline" onClick={resetFilters}>{text.resetFilters}</button> : null}</div></div>
        {clubs.length ? <div className="flex flex-wrap gap-1">{clubs.map((club) => <button key={club} type="button" onClick={() => toggleClub(club)} className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent" aria-label={text.removeClub(clubName(club))}>{clubName(club)} ×</button>)}</div> : null}
        <input className="w-full" value={clubSearch} onChange={(event) => setClubSearch(event.target.value)} placeholder={text.searchClubPlaceholder} aria-label={text.searchClub} />
        {clubOptions === null ? <p className="p-4 text-center text-sm text-muted">{text.loadingClubs}</p> : visibleClubs.length ? <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2 lg:grid-cols-3">{visibleClubs.map((club) => <label key={club} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={clubs.includes(club)} onChange={() => toggleClub(club)} /><span className="truncate">{clubName(club)}</span></label>)}</div> : <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">{text.noClubs}</p>}</div>
    </div> : null}
    <p className="text-sm text-muted">{loading && !page.cards.length ? text.loadingPlayers : filterText.showing(page.cards.length, page.total)}</p>
    {page.cards.length ? <div className={`grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}>{page.cards.map((player) => <PlayerCard key={player.id} player={player} owned={owned.has(player.id)} budget={budget} action={action} pending={pending} />)}</div> : loading ? null : <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">{text.noPlayers}</p>}
    {loadError ? <p className="text-sm text-danger">{loadError}</p> : null}
    {page.cards.length < page.total ? <button type="button" className={`${secondaryButtonClass} justify-self-center`} disabled={loading} onClick={() => void load(filters, page.cards.length)}>{loading ? text.loadingMore : text.showMore}</button> : null}
    {state.error ? <p className="text-sm text-danger">{state.error}</p> : state.ok ? <p className="text-sm text-success">{text.added}</p> : null}
  </section>;
}

// FC-inspirert kort: rating, posisjon, flagg og klubb i venstre kolonne, stort spillerbilde og navnelinje nederst.
// Kortet fyller bredden til forelderen og skalerer alt innhold med kortbredden (cqw).
type CardPointerHandler = (event: React.PointerEvent<HTMLButtonElement>) => void;
function SquadCard({ card, position, active, dimmed = false, dropTarget = false, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick, selected }: { card: ManagerCard; position: string; active: boolean; dimmed?: boolean; dropTarget?: boolean; onPointerDown?: CardPointerHandler; onPointerMove?: CardPointerHandler; onPointerUp?: CardPointerHandler; onPointerCancel?: CardPointerHandler; onClick?: () => void; selected: boolean }) {
  const photo = playerPhoto(card.slug ?? ""); const crest = clubCrest(card.club); const flag = playerFlag(card.slug);
  const positionLabel = usePositionLabel();
  const outOfPosition = card.position !== anyPosition && position !== card.position;
  // Som i FC: lange navn vises uten fornavn ("Virgil van Dijk" -> "van Dijk"), fullt navn står i spillerdetaljene.
  const shortName = card.name.length > 13 && card.name.includes(" ") ? card.name.slice(card.name.indexOf(" ") + 1) : card.name;
  return <button type="button" data-lineup-card={card.id} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onClick={onClick} className={`@container relative block aspect-[100/136] w-full select-none overflow-hidden rounded-[9%/7%] border-2 text-white shadow-[0_8px_18px_rgba(0,0,0,.45)] transition ${dimmed ? "border-dashed border-white/60 opacity-35" : dropTarget ? "z-10 scale-105 border-cyan-300 ring-4 ring-cyan-300/70" : active ? "z-10 scale-105 border-cyan-300 ring-2 ring-cyan-300/60" : "border-amber-200/80 hover:-translate-y-1 hover:border-white"} ${selected && !dimmed ? "ring-[3px] ring-white" : ""}`} style={{ background: card.special ? specialStyles[card.special].background : `radial-gradient(circle at 85% 0%, ${card.accent}cc, transparent 45%), linear-gradient(160deg, #f3d57a 0%, #d3a13a 30%, #8a5a17 70%, #3a230c 100%)`, ...(card.special ? { borderColor: specialStyles[card.special].border } : {}), touchAction: "none" }} aria-label={`${card.name}, ${card.overall}, ${positionLabel(position)}`}>
    <span className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,.35),transparent_32%,transparent_60%,rgba(0,0,0,.25))]" />
    {photo ? <Image src={photo} alt="" width={256} height={256} draggable={false} className="pointer-events-none absolute bottom-[21%] right-[-12%] h-[90cqw] w-[90cqw] object-contain object-bottom drop-shadow-[0_6px_6px_rgba(0,0,0,.45)]" /> : <span className="absolute bottom-[30%] right-[12%] text-[34cqw] leading-none opacity-80">⚽</span>}
    <span className="absolute left-[6cqw] top-[6cqw] flex w-[24cqw] flex-col items-center gap-[2.5cqw] drop-shadow-[0_1px_2px_rgba(0,0,0,.6)]">
      <b className={`${card.overall >= 100 ? "text-[19cqw]" : "text-[27cqw]"} font-black leading-[.85] tracking-tighter`} style={card.special ? { color: specialStyles[card.special].badge } : undefined}>{card.overall}</b>
      <span className={`text-[max(7px,12cqw)] font-black leading-none tracking-wide ${outOfPosition ? "text-cyan-100" : ""}`}>{positionLabel(position)}</span>
      {flag ? <Image src={flag} alt="" width={32} height={24} unoptimized draggable={false} className="mt-[1cqw] h-[13cqw] w-[18cqw] rounded-[2px] object-cover ring-1 ring-black/30" /> : null}
      {crest ? <Image src={crest} alt="" width={32} height={32} draggable={false} className="h-[18cqw] w-[18cqw] object-contain" /> : null}
    </span>
    <span className="absolute inset-x-0 bottom-0 flex h-[21%] items-center justify-center border-t border-white/40 bg-black/45 px-[5cqw]"><b className={`truncate font-black uppercase leading-none tracking-wide ${shortName.length > 12 ? "text-[max(7px,8.5cqw)]" : shortName.length > 9 ? "text-[max(7px,10cqw)]" : "text-[max(7px,12cqw)]"}`}>{shortName}</b></span>
  </button>;
}

// Felles id for tomme benkeplasser, så dra-og-slipp kan treffe dem som et vanlig kort.
const emptyBenchId = "empty-bench";

type SwapOption = { card: ManagerCard; position: string; blocker: string | null };
type SwapGroup = { title: string; options: SwapOption[] };

// Menyen som kommer opp når man trykker på en spiller: først «Bytt inn/ut», deretter hvem han skal bytte plass med.
// Portal til body, siden troppen ligger i et kort med backdrop-blur som ellers ville fanget «fixed».
function SwapSheet({ card, role, groups, onSwap, onClose }: { card: ManagerCard; role: string; groups: SwapGroup[]; onSwap: (targetId: string) => void; onClose: () => void }) {
  const text = useT().career.squad;
  const positionLabel = usePositionLabel();
  const [choosing, setChoosing] = useState(false);
  // Kortet flyttes til lageret på serveren med en gang. Står det i elleveren eller på benken, tas det ut der også.
  const [storeState, storeAction, storing] = useActionState(moveManagerCardAction, initial);
  useScrollLock();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(<div className="fixed inset-0 z-[60] flex items-end justify-center overscroll-contain bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="swap-sheet-title" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl border border-white/10 bg-slate-950 text-white shadow-2xl sm:rounded-2xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center gap-3 border-b border-white/10 p-4"><b className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-amber-300/15 text-xl font-black text-amber-200">{card.overall}</b><div className="min-w-0"><h3 id="swap-sheet-title" className="truncate text-lg font-black">{card.name}</h3><p className="text-xs font-bold tracking-[.18em] text-white/55">{positionLabel(card.position)} · {role}</p></div><button type="button" onClick={onClose} className="ml-auto rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10">{text.close}</button></div>
      {choosing ? <div className="grid gap-4 overflow-y-auto overscroll-contain p-4"><p className="text-sm text-white/70">{text.swapIntro(card.name)}</p>
        {groups.filter((group) => group.options.length).map((group) => <div key={group.title} className="grid gap-2"><h4 className="text-xs font-black tracking-[.18em] text-cyan-300">{group.title}</h4>
          {group.options.map(({ card: option, position, blocker }) => <button key={option.id} type="button" disabled={Boolean(blocker)} onClick={() => onSwap(option.id)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-cyan-300/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><span className="w-11 shrink-0 rounded bg-white/10 py-1 text-center text-xs font-black">{positionLabel(position)}</span><b className="w-7 shrink-0 text-center tabular-nums">{option.overall}</b><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{option.name}</span>{blocker ? <span className="block truncate text-xs text-white/60">{blocker}</span> : null}</span></button>)}
        </div>)}
      </div> : <div className="grid gap-3 p-4"><div className="grid grid-cols-3 gap-2 text-center">{Object.entries(card.attributes).slice(0, 6).map(([key, value]) => <div key={key} className="rounded-lg bg-white/8 p-2"><b className="block text-lg">{value}</b><span className="text-[10px] font-bold text-white/45">{key.slice(0, 3).toUpperCase()}</span></div>)}</div><button type="button" autoFocus onClick={() => setChoosing(true)} className={buttonClass}>{text.swapPlayer}</button><form action={storeAction} className="grid"><input type="hidden" name="card_id" value={card.id} /><input type="hidden" name="location" value="storage" /><button className={secondaryButtonClass} disabled={storing}>{storing ? text.sendingToStorage : text.sendToStorage}</button></form>{storeState.error ? <p className="text-sm text-danger">{storeState.error}</p> : null}</div>}
    </div>
  </div>, document.body);
}

function Squad({ cards, lineup }: { cards: ManagerCard[]; lineup: ManagerLineup | null }) {
  const savedFormation = formationNames.includes(lineup?.formation as Formation) ? lineup!.formation as Formation : "4-3-3";
  // En benk med færre enn 7 (f.eks. etter at et benkekort er levert i en SBC) beholdes, så elleveren ikke stokkes om.
  const initialLineup = useMemo(() => lineup?.starters.length === 11 && lineup.bench.length <= 7 ? { starters: lineup.starters, bench: lineup.bench } : pickBestLineup(cards, savedFormation), [cards, lineup, savedFormation]);
  const [formation, setFormation] = useState<Formation>(savedFormation);
  const [starters, setStarters] = useState(initialLineup.starters);
  const [bench, setBench] = useState(initialLineup.bench);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  // Posisjonen under dragning ligger i en ref og skrives rett til spøkelseskortet, så ikke hele troppen rendres på hver bevegelse.
  const dragRef = useRef<{ id: string; width: number; grabX: number; grabY: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [ghost, setGhost] = useState<{ id: string; width: number } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  // Klikket som kommer rett etter at et kort er sluppet, skal ikke åpne byttemenyen.
  const suppressClickRef = useRef(false);
  const [notice, setNotice] = useState("");
  const t = useT(); const text = t.career.squad;
  // Det som faktisk er lagret. Mangler det en spiller (f.eks. etter at et kort er sendt til lageret),
  // fylles laget ut her, og da kan det lagres med en gang.
  const [savedSnapshot] = useState(`${lineup?.formation ?? ""}|${lineup?.starters.join(",") ?? ""}|${lineup?.bench.join(",") ?? ""}`);
  const [state, action, pending] = useActionState(saveManagerLineupAction, initial);
  // Egen handling: «Velg beste tropp» henter fra hele klubben og må derfor flytte kort på serveren.
  const [autoState, autoAction, autoPending] = useActionState(autoPickBestSquadAction, initial);
  const cardById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const reserves = cards.filter((card) => !starters.includes(card.id) && !bench.includes(card.id));
  const snapshot = `${formation}|${starters.join(",")}|${bench.join(",")}`;
  const canSave = starters.length === 11 && bench.length === 7 && snapshot !== savedSnapshot && !pending;

  // Hvorfor to spillere ikke kan bytte plass, eller null. Brukes både av dra-og-slipp og byttemenyen.
  const swapBlocker = (sourceId: string, targetId: string) => {
    const source = cardById.get(sourceId); const target = cardById.get(targetId);
    if (!source || !target) return null;
    const sourceStarter = starters.indexOf(sourceId); const targetStarter = starters.indexOf(targetId);
    const slots = formations[formation];
    if (targetStarter >= 0 && !canPlayPosition(source.position, slots[targetStarter].position)) return text.cannotPlay(source.name, slots[targetStarter].position);
    if (sourceStarter >= 0 && !canPlayPosition(target.position, slots[sourceStarter].position)) return text.cannotPlay(target.name, slots[sourceStarter].position);
    return null;
  };
  const handleDrop = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    // Tom benkeplass: bare en reserve kan fylle den, ellers blir det et hull et annet sted.
    if (targetId === emptyBenchId) {
      if (cardById.has(sourceId) && !starters.includes(sourceId) && !bench.includes(sourceId) && bench.length < 7) { setBench([...bench, sourceId]); setNotice(""); }
      return;
    }
    if (!cardById.has(sourceId) || !cardById.has(targetId)) return;
    const sourceStarter = starters.indexOf(sourceId); const targetStarter = starters.indexOf(targetId);
    const sourceBench = bench.indexOf(sourceId); const targetBench = bench.indexOf(targetId);
    const blocker = swapBlocker(sourceId, targetId);
    if (blocker) { setNotice(blocker); return; }
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
  // Kortet under pekeren, utenom kortet som dras. Spøkelseskortet har pointer-events-none og treffes ikke.
  const cardUnder = (x: number, y: number, exclude: string) => document.elementsFromPoint(x, y).map((element) => element.closest<HTMLElement>("[data-lineup-card]")?.dataset.lineupCard).find((id) => id && id !== exclude) ?? null;
  const moveGhost = () => { const drag = dragRef.current; if (drag && ghostRef.current) ghostRef.current.style.transform = `translate(${drag.x - drag.grabX}px, ${drag.y - drag.grabY}px)`; };
  const endDrag = () => { dragRef.current = null; setDraggedId(null); setGhost(null); setHoverId(null); };
  const pointerDown = (id: string): CardPointerHandler => (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { id, width: rect.width, grabX: event.clientX - rect.left, grabY: event.clientY - rect.top, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false };
    setDraggedId(id);
  };
  const pointerMove: CardPointerHandler = (event) => {
    const drag = dragRef.current; if (!drag) return;
    drag.x = event.clientX; drag.y = event.clientY;
    // Litt slingringsmonn, så et vanlig trykk for spillerdetaljer ikke blir til en dragning.
    if (!drag.moved) { if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return; drag.moved = true; setGhost({ id: drag.id, width: drag.width }); }
    moveGhost(); setHoverId(cardUnder(drag.x, drag.y, drag.id));
  };
  const pointerUp: CardPointerHandler = (event) => {
    const drag = dragRef.current;
    if (drag?.moved) {
      suppressClickRef.current = true; setTimeout(() => { suppressClickRef.current = false; }, 0);
      const target = cardUnder(event.clientX, event.clientY, drag.id); if (target) handleDrop(drag.id, target);
    }
    endDrag();
  };
  // Siden ruller av seg selv når et kort dras mot kanten, så et kort fra benken kan dras helt opp på banen.
  const dragging = ghost !== null;
  useEffect(() => {
    if (!dragging) return;
    let frame = 0;
    const step = () => {
      const drag = dragRef.current;
      if (drag) {
        const edge = 80; const speed = drag.y < edge ? -(edge - drag.y) / 4 : drag.y > window.innerHeight - edge ? (drag.y - (window.innerHeight - edge)) / 4 : 0;
        if (speed) { window.scrollBy(0, speed); setHoverId(cardUnder(drag.x, drag.y, drag.id)); }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [dragging]);
  const openMenu = (id: string) => { if (suppressClickRef.current) return; setSelectedId(id); setMenuId(id); };
  const cardProps = (id: string) => ({ active: draggedId === id, dimmed: ghost?.id === id, dropTarget: hoverId === id, selected: selectedId === id, onPointerDown: pointerDown(id), onPointerMove: pointerMove, onPointerUp: pointerUp, onPointerCancel: endDrag, onClick: () => openMenu(id) });
  const ghostCard = ghost ? cardById.get(ghost.id) : null;
  const ghostPosition = ghost && starters.includes(ghost.id) ? formations[formation][starters.indexOf(ghost.id)].position : ghostCard?.position;
  const chooseFormation = (nextFormation: Formation) => { setFormation(nextFormation); const next = rearrangeLineup(cards, nextFormation, starters, bench); setStarters(next.starters); setBench(next.bench); setNotice(""); };
  const selected = selectedId ? cardById.get(selectedId) : null;
  const selectedFlag = selected ? playerFlag(selected.slug) : null;
  const visibleSlots = formations[formation];
  const menuCard = menuId ? cardById.get(menuId) : null;
  const swapOption = (card: ManagerCard, position: string): SwapOption => ({ card, position, blocker: swapBlocker(menuId!, card.id) });
  const starterOptions = (exclude: string | null) => starters.flatMap((id, index) => { const card = cardById.get(id); return card && id !== exclude ? [swapOption(card, visibleSlots[index].position)] : []; });
  const benchOptions = (exclude: string | null) => bench.flatMap((id) => { const card = cardById.get(id); return card && id !== exclude ? [swapOption(card, card.position)] : []; });
  const reserveOptions = (exclude: string | null) => reserves.filter((card) => card.id !== exclude).map((card) => swapOption(card, card.position));
  // Startspillere bytter helst med benken, benk og reserver helst med elleveren. Benk mot benk gir ingen endring og vises ikke.
  const menuRole = !menuId ? "" : starters.includes(menuId) ? text.starters : bench.includes(menuId) ? text.bench : text.reserves;
  const menuGroups: SwapGroup[] = !menuId ? [] : starters.includes(menuId)
    ? [{ title: text.bench, options: benchOptions(menuId) }, { title: text.reserves, options: reserveOptions(menuId) }, { title: text.starters, options: starterOptions(menuId) }]
    : bench.includes(menuId)
      ? [{ title: text.starters, options: starterOptions(menuId) }, { title: text.reserves, options: reserveOptions(menuId) }]
      : [{ title: text.starters, options: starterOptions(menuId) }, { title: text.bench, options: benchOptions(menuId) }];
  const closeMenu = () => setMenuId(null);
  return <section className={`${cardClass} grid gap-5 overflow-hidden`}><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-[.22em] text-cyan-300">{text.eyebrow}</p><h2 className="mt-1 text-2xl font-black">{text.heading}</h2><p className="mt-1 text-sm text-muted">{text.intro}</p></div><span className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{cards.length} / {squadCapacity}</span></div>
    <form action={action} className="grid gap-4"><input type="hidden" name="formation" value={formation} />{starters.map((id) => <input key={`starter-${id}`} type="hidden" name="starter_ids" value={id} />)}{bench.map((id) => <input key={`bench-${id}`} type="hidden" name="bench_ids" value={id} />)}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><label className="text-sm font-semibold text-white/75">{text.formation}<select value={formation} onChange={(event) => chooseFormation(event.target.value as Formation)} className="ml-2 bg-slate-900 text-sm"><>{formationNames.map((name) => <option key={name}>{name}</option>)}</></select></label><button type="submit" formAction={autoAction} className={secondaryButtonClass} disabled={autoPending}>{autoPending ? text.pickingBest : text.pickBest}</button><span className="ml-auto text-xs text-white/50">{text.counts(starters.length, bench.length)}</span></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">{/* Høy bane på mobil, bred fra sm og opp. Mål og kortbredder følger pitchLayouts i squad-pitch.tsx. */}
        <div className="@container relative aspect-[1000/1500] overflow-hidden rounded-2xl border border-emerald-200/25 bg-[#062a1d] shadow-[inset_0_0_90px_rgba(0,0,0,.6)] sm:aspect-[1000/900]"><PitchMarkings layout="tall" className="sm:hidden" /><PitchMarkings layout="wide" className="hidden sm:block" />
        {visibleSlots.map((slot, index) => { const card = cardById.get(starters[index]); const tall = slotPoint(slot, "tall"); const wide = slotPoint(slot, "wide"); return card ? <div key={`${slot.position}-${index}`} className="absolute left-(--tall-left) top-(--tall-top) w-[16cqw] -translate-x-1/2 -translate-y-1/2 sm:left-(--wide-left) sm:top-(--wide-top) sm:w-[clamp(60px,12.5cqw,170px)]" style={{ "--tall-left": tall.left, "--tall-top": tall.top, "--wide-left": wide.left, "--wide-top": wide.top } as React.CSSProperties}><SquadCard card={card} position={slot.position} {...cardProps(card.id)} /></div> : null; })}</div>
        <aside className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-white">{selected ? <><div className="flex items-start gap-3">{selectedFlag ? <Image src={selectedFlag} alt="" width={48} height={36} unoptimized className="mt-1 h-9 w-12 shrink-0 rounded object-cover shadow ring-1 ring-black/30" /> : null}<div><p className="text-xs font-bold tracking-[.18em] text-cyan-300">{text.playerDetails}</p><h3 className="mt-1 text-lg font-black">{selected.name}</h3><p className="text-sm text-white/55">{t.career.clubName(selected.club)}</p>{selected.special === "personal" ? <p className="mt-1 text-xs font-semibold" style={{ color: specialStyles.personal.badge }}>{t.career.special.personalHint}</p> : null}</div></div><div className="mt-5 grid grid-cols-2 gap-3 text-center">{[["OVR", selected.overall], ...Object.entries(selected.attributes).slice(0, 5).map(([key, value]) => [key.slice(0, 3).toUpperCase(), value])].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white/8 p-3"><b className="block text-2xl">{value}</b><span className="text-[10px] font-bold text-white/45">{label}</span></div>)}</div></> : <div className="grid h-full min-h-36 place-items-center text-center text-sm text-white/50">{text.tapForDetails}</div>}</aside></div>
      <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black tracking-wide">{text.bench}</h3><span className="text-xs text-muted">{text.dragHere}</span></div><div className="flex flex-wrap gap-3">{bench.map((id) => { const card = cardById.get(id); return card ? <div key={id} className={benchCardClass}><SquadCard card={card} position={card.position} {...cardProps(id)} /></div> : null; })}{Array.from({ length: Math.max(0, 7 - bench.length) }, (_, index) => <div key={`empty-${index}`} data-lineup-card={emptyBenchId} className={`${benchCardClass} grid aspect-[100/136] place-items-center rounded-[9%/7%] border-2 border-dashed p-2 text-center text-xs font-bold transition ${hoverId === emptyBenchId ? "scale-105 border-cyan-300 text-cyan-200" : "border-white/30 text-white/50"}`}>{text.emptyBenchSlot}</div>)}</div></div>
      <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-black tracking-wide">{text.reserves}</h3><span className="text-xs text-muted">{text.available(reserves.length)}</span></div>{reserves.length ? <div className="flex flex-wrap gap-3">{reserves.map((card) => <div key={card.id} className={benchCardClass}><SquadCard card={card} position={card.position} {...cardProps(card.id)} /></div>)}</div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">{text.noReserves}</p>}</div>
      <div className="flex flex-wrap items-center gap-3"><button className={buttonClass} disabled={!canSave}>{pending ? text.saving : text.save}</button>{!canSave && !pending ? <span className="text-xs text-muted">{starters.length !== 11 || bench.length !== 7 ? text.needFullLineup : text.noChanges}</span> : null}{notice ? <span className="text-sm text-cyan-300">{notice}</span> : null}{autoState.error ? <p className="text-sm text-danger">{autoState.error}</p> : null}{state.error ? <p className="text-sm text-danger">{state.error}</p> : state.ok ? <p className="text-sm text-success">{text.saved}</p> : null}</div>
    </form>
    {/* Kortet som følger pekeren. Portal til body, så det ikke klippes av banen (overflow-hidden) når det dras ned til benken. */}
    {menuCard ? <SwapSheet key={menuCard.id} card={menuCard} role={menuRole} groups={menuGroups} onSwap={(targetId) => { handleDrop(menuCard.id, targetId); setMenuId(null); }} onClose={closeMenu} /> : null}
    {ghost && ghostCard ? createPortal(<div ref={(element) => { ghostRef.current = element; moveGhost(); }} aria-hidden className="pointer-events-none fixed left-0 top-0 z-50" style={{ width: ghost.width }}><div className="rotate-3 scale-110 drop-shadow-[0_18px_24px_rgba(0,0,0,.55)]"><SquadCard card={ghostCard} position={ghostPosition ?? ghostCard.position} active selected={false} /></div></div>, document.body) : null}
  </section>;
}

// Hurtigsalg kan ikke angres, så spilleren må bekrefte før kortet forsvinner.
function QuickSellButton({ card, value }: { card: ManagerCard; value: number }) {
  const [state, action, pending] = useActionState(quickSellManagerCardAction, initial);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const payout = quickSellValue(value);
  const text = useT().career.quickSell;
  return <>
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="card_id" value={card.id} />
      <button type="button" className={secondaryButtonClass} disabled={pending} onClick={() => setConfirming(true)}>{text.button(payout)}</button>
      {state.error ? <span className="text-sm text-danger">{state.error}</span> : null}
    </form>
    {confirming ? <ConfirmDialog message={text.confirm(card.name, payout)} onCancel={() => setConfirming(false)} onConfirm={() => { setConfirming(false); formRef.current?.requestSubmit(); }} /> : null}
  </>;
}

function Storage({ storage, squad, listedCardIds }: { storage: ManagerCard[]; squad: ManagerCard[]; listedCardIds: Set<string> }) {
  const [moveState, moveAction, movePending] = useActionState(moveManagerCardAction, initial);
  const [swapState, swapAction, swapPending] = useActionState(swapManagerCardsAction, initial);
  const roomInSquad = squad.length < squadCapacity;
  // Maks ett kort av hver spiller i troppen. Har troppen allerede spilleren (f.eks. vanlig-kortet når
  // informen ligger her), byttes de to i stedet, og lagerkortet tar plassen i elleveren eller på benken.
  const squadCopyOf = new Map(squad.flatMap((card) => card.catalog_id ? [[card.catalog_id, card] as const] : []));
  const t = useT(); const text = t.career.storage; const filterText = t.career.filters; const clubName = t.career.clubName;
  const locale = useLocale(); const intl = INTL_LOCALES[locale];
  const message = moveState.error ?? swapState.error;
  // Lageret har ingen grense, så med mange kort trengs søk, posisjonsfilter og sortering.
  const [search, setSearch] = useState(""); const [position, setPosition] = useState("all"); const [sort, setSort] = useState("overall-desc");
  const cards = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(intl);
    const matches = storage.filter((card) => (position === "all" || card.position === position) && (!needle || card.name.toLocaleLowerCase(intl).includes(needle) || card.club.toLocaleLowerCase(intl).includes(needle) || clubName(card.club).toLocaleLowerCase(intl).includes(needle)));
    if (sort === "overall-asc") return matches.sort((first, second) => first.overall - second.overall || first.name.localeCompare(second.name, intl));
    if (sort === "value-desc") return matches.sort((first, second) => second.value - first.value || second.overall - first.overall);
    if (sort === "name") return matches.sort((first, second) => first.name.localeCompare(second.name, intl));
    if (sort === "position") return matches.sort((first, second) => positionOrder.indexOf(first.position) - positionOrder.indexOf(second.position) || second.overall - first.overall);
    return matches.sort((first, second) => second.overall - first.overall || first.name.localeCompare(second.name, intl));
  }, [clubName, intl, position, search, sort, storage]);
  const positions = useMemo(() => positionOrder.filter((item) => storage.some((card) => card.position === item)), [storage]);
  return <section className={`${cardClass} grid gap-4`}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-lg font-semibold">{text.heading}</h2><p className="text-sm text-muted">{roomInSquad ? text.roomInSquad : text.squadFull}</p></div>
      <span className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{text.cardCount(storage.length)}</span>
    </div>
    {storage.length ? <div className="grid gap-2 rounded-xl border border-border bg-surface-raised p-3 sm:grid-cols-[2fr_1fr_1fr] sm:items-end"><label className="text-xs text-muted">{filterText.search}<input className="mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.searchPlaceholder} /></label><label className="text-xs text-muted">{filterText.position}<select className="mt-1 w-full" value={position} onChange={(event) => setPosition(event.target.value)}><option value="all">{filterText.all}</option>{positions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs text-muted">{filterText.sort}<select className="mt-1 w-full" value={sort} onChange={(event) => setSort(event.target.value)}><option value="overall-desc">{filterText.ratingHighLow}</option><option value="overall-asc">{filterText.ratingLowHigh}</option><option value="value-desc">{filterText.valueHighLow}</option><option value="position">{filterText.position}</option><option value="name">{filterText.name}</option></select></label></div> : null}
    {storage.length && cards.length !== storage.length ? <p className="text-sm text-muted">{filterText.showing(cards.length, storage.length)}</p> : null}
    {storage.length && !cards.length ? <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">{text.noMatches}</p> : null}
    {cards.length ? <div className="grid gap-2">{cards.map((card) => <div key={card.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
      <div className="grid h-9 w-9 place-items-center rounded bg-accent-soft font-bold" style={card.special ? { background: specialStyles[card.special].background, color: specialStyles[card.special].badge, border: `1px solid ${specialStyles[card.special].border}` } : undefined}>{card.overall}</div>
      <div className="min-w-0 flex-1"><b className="block truncate text-sm">{card.name}{card.special ? <span className="ml-2 rounded px-1.5 py-0.5 align-middle text-[10px] font-black tracking-wider text-black" style={{ background: specialStyles[card.special].badge }}>{t.career.special.badge[card.special]}</span> : null}</b><span className="text-xs text-muted">{card.position === anyPosition ? t.career.special.anyPosition : card.position} · {clubName(card.club)}{card.special && !card.tradable ? ` · ${t.career.special.untradable}` : ""}</span>{card.special === "personal" ? <span className="block text-xs text-muted">{t.career.special.personalHint}</span> : null}</div>
      {listedCardIds.has(card.id) ? null
        : card.catalog_id && squadCopyOf.has(card.catalog_id) ? <form action={swapAction}><input type="hidden" name="storage_card" value={card.id} /><input type="hidden" name="squad_card" value={squadCopyOf.get(card.catalog_id)!.id} /><button className={secondaryButtonClass} disabled={swapPending}>{text.swapWithSquadCopy}</button></form>
        : roomInSquad ? <form action={moveAction}><input type="hidden" name="card_id" value={card.id} /><input type="hidden" name="location" value="squad" /><button className={secondaryButtonClass} disabled={movePending}>{text.moveToSquad}</button></form>
        : <form action={swapAction} className="flex items-center gap-2"><input type="hidden" name="storage_card" value={card.id} /><select name="squad_card" className="text-sm" aria-label={text.swapWith(card.name)} defaultValue="">{<option value="" disabled>{text.swapWithPlaceholder}</option>}{squad.map((option) => <option key={option.id} value={option.id}>{option.overall} {option.name}</option>)}</select><button className={secondaryButtonClass} disabled={swapPending}>{text.swap}</button></form>}
      {(card.tradable || card.special) && card.catalog_id ? listedCardIds.has(card.id) ? <span className="text-xs text-muted">{text.listed}</span> : <QuickSellButton card={card} value={card.value} /> : null}
    </div>)}</div> : storage.length ? null : <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">{text.empty}</p>}
    {message ? <p className="text-sm text-danger">{message}</p> : null}
  </section>;
}

export type ManagerCareerSection = "squad" | "storage" | "packs" | "catalog";

const emptyShop: PackShop = { purchasedThisWeek: {}, informFactor: 1, informs: [], nextReset: "" };

export function ManagerCareer({ cards, catalogPage = { cards: [], total: 0 }, lineup, packs, listedCardIds, freePacks = {}, budget, section, shop = emptyShop }: { cards: ManagerCard[]; catalogPage?: { cards: CatalogCard[]; total: number }; lineup: ManagerLineup | null; packs: ManagerPack[]; listedCardIds: string[]; freePacks?: Record<string, number>; budget: number; section: ManagerCareerSection; shop?: PackShop }) {
  const squad = cards.filter((card) => card.location === "squad");
  const storage = cards.filter((card) => card.location === "storage");
  if (section === "squad") return <Squad key={lineup?.updated_at ?? "new-lineup"} cards={squad} lineup={lineup} />;
  if (section === "storage") return <Storage storage={storage} squad={squad} listedCardIds={new Set(listedCardIds)} />;
  // Duplikater stopper ikke pakkene: et kort av en spiller man allerede har i troppen, havner på lageret.
  if (section === "packs") return <PackStore packs={packs} freePacks={freePacks} budget={budget} shop={shop} />;
  return <Catalog initialPage={catalogPage} owned={new Set(cards.filter((card) => !card.special_card_id).map((card) => card.catalog_id).filter((id): id is string => Boolean(id)))} budget={budget} />;
}
