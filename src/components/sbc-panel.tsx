"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useT } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";
import { canPlayPosition } from "@/lib/lineup";
import { autoFill, autoFillPartial, placeCards, requirementStatus, sbcSatisfied, sbcSlots, suggestCards, teamRating, type SbcCard, type SbcChallenge, type SbcRequirement } from "@/lib/sbc";
import { completeSbcAction } from "@/lib/sbc-actions";
import type { SbcData } from "@/lib/sbc-data";
import { ConfirmDialog } from "./confirm-dialog";

function requirementText(t: Dictionary, req: SbcRequirement) {
  const text = t.sbc.req;
  switch (req.type) {
    case "team_rating": return text.teamRating(req.value);
    case "min_card_rating": return text.minCardRating(req.value);
    case "cards_with_rating": return text.cardsWithRating(req.count, req.rating);
    case "position_group": return text.positionGroup(req.count, t.sbc.groups[req.group]);
    case "same_club": return text.sameClub(req.count);
    case "league": return text.league(req.count, t.sbc.leagues[req.league] ?? req.league);
    case "same_nation": return text.sameNation(req.count);
  }
}

function rewardText(t: Dictionary, challenge: { rewardMb: number; rewardPack: string | null }) {
  const parts: string[] = [];
  if (challenge.rewardPack) parts.push(t.market.packs.name(challenge.rewardPack, challenge.rewardPack));
  if (challenge.rewardMb) parts.push(t.sbc.rewardMb(challenge.rewardMb));
  return parts.join(" + ");
}

const attemptsLeft = (challenge: SbcChallenge) => (challenge.weeklyLimit === null ? Infinity : Math.max(0, challenge.weeklyLimit - challenge.usedThisWeek));

/** «fredag 18:00» i brukerens egen tidssone. Serveren kan ha en annen tidssone, så teksten får lov til å avvike ved første visning. */
function resetLabel(locale: string, nextReset: string) {
  try { return new Intl.DateTimeFormat(locale, { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(nextReset)); } catch { return ""; }
}

export function SbcPanel({ challenges, cards, nextReset }: SbcData) {
  const t = useT();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const locale = useLocale();
  const open = challenges.find((challenge) => challenge.key === openKey);
  if (open) return <SbcBuilder key={open.key} challenge={open} cards={cards} onBack={() => setOpenKey(null)} />;
  // Brukte SBC-er havner nederst.
  const sorted = [...challenges].sort((a, b) => Number(attemptsLeft(a) === 0) - Number(attemptsLeft(b) === 0));
  return <div className="grid gap-4">
    <p className="text-sm text-white/60">{t.sbc.intro}<span suppressHydrationWarning> {t.sbc.resets(resetLabel(locale, nextReset))}.</span></p>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((challenge) => {
        const left = attemptsLeft(challenge); const done = left === 0; const item = t.sbc.items[challenge.key];
        return <button key={challenge.key} type="button" disabled={done} onClick={() => setOpenKey(challenge.key)} className={`grid gap-3 rounded-2xl border p-4 text-left transition ${done ? "border-white/10 bg-white/[.03] opacity-60" : "border-white/15 bg-white/5 hover:border-lime-300/60"}`}>
          <span className="flex items-start justify-between gap-3">
            <span><b className="block text-lg font-black">{item?.title ?? challenge.key}</b><span className="mt-1 block text-sm text-white/60">{item?.description}</span></span>
            {done ? <span className="shrink-0 rounded-full bg-lime-300 px-2.5 py-1 text-[10px] font-black tracking-wide text-slate-950">{t.sbc.completedBadge.toUpperCase()}</span> : null}
          </span>
          <span className="flex flex-wrap gap-1.5 text-xs font-bold text-white/75">
            <span className="rounded-full bg-white/10 px-2.5 py-1">{t.sbc.cardCount(challenge.cardCount)}</span>
            {challenge.requirements.map((req, index) => <span key={index} className="rounded-full bg-white/10 px-2.5 py-1">{requirementText(t, req)}</span>)}
          </span>
          <span className="flex items-end justify-between gap-3 border-t border-white/10 pt-3">
            <span><span className="block text-[10px] font-bold tracking-widest text-white/45">{t.sbc.reward.toUpperCase()}</span><b className="text-cyan-300">{rewardText(t, challenge)}</b></span>
            <span className="text-xs font-bold text-white/55">{challenge.weeklyLimit === null ? t.sbc.unlimited : t.sbc.attempts(left, challenge.weeklyLimit)}</span>
          </span>
        </button>;
      })}
    </div>
    {cards.length === 0 ? <p className="rounded-lg border border-white/10 p-3 text-sm text-white/60">{t.sbc.noCards}</p> : null}
  </div>;
}

function MiniCard({ card }: { card: SbcCard }) {
  const t = useT();
  return <span className="relative grid h-full w-full content-center justify-items-center overflow-hidden rounded-xl border border-white/25 px-0.5 text-white shadow-lg" style={{ background: `radial-gradient(circle at 85% 5%, ${card.accent}cc 0, transparent 55%), linear-gradient(145deg, #08150e, #102b1a)` }}>
    <b className="text-xl font-black leading-none">{card.overall}</b>
    <span className="text-[10px] font-black">{card.position}</span>
    <span className="mt-1 w-full truncate text-center text-[10px] font-bold">{card.name}</span>
    {card.onBench ? <span className="absolute inset-x-0 top-0 bg-amber-300 text-center text-[8px] font-black uppercase leading-3 text-slate-950">{t.sbc.picker.bench}</span> : null}
  </span>;
}

function SbcBuilder({ challenge, cards, onBack }: { challenge: SbcChallenge; cards: SbcCard[]; onBack: () => void }) {
  const t = useT(); const text = t.sbc.builder;
  const slots = useMemo(() => sbcSlots(challenge.cardCount), [challenge.cardCount]);
  const [chosen, setChosen] = useState<(SbcCard | null)[]>(() => slots.map(() => null));
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<{ rewardMb: number; rewardPack: string | null } | null>(null);
  const [pending, startTransition] = useTransition();
  const item = t.sbc.items[challenge.key];
  const placed = chosen.filter((card): card is SbcCard => Boolean(card));
  const satisfied = sbcSatisfied(challenge.requirements, placed, challenge.cardCount);

  function fill() {
    setError(null); setNotice(null);
    // Kortene du allerede har lagt inn beholdes hvis det går. Ellers prøver vi på nytt fra scratch.
    // Benken brukes bare når reservene og lageret ikke strekker til.
    const reserves = cards.filter((card) => !card.onBench);
    for (const pool of reserves.length < cards.length ? [reserves, cards] : [cards]) {
      const kept = autoFill(pool, challenge.requirements, challenge.cardCount, placed);
      if (kept) { setChosen(placeCards(slots, chosen, kept)); return; }
      const fresh = autoFill(pool, challenge.requirements, challenge.cardCount);
      if (fresh) { setChosen(placeCards(slots, slots.map(() => null), fresh)); return; }
    }
    // Kortene strekker ikke til: legg inn de som oppfyller kravene så langt det går, så fikser brukeren resten.
    const partial = autoFillPartial(cards, challenge.requirements, challenge.cardCount, placed);
    if (partial.length > placed.length) { setChosen(placeCards(slots, chosen, partial)); setNotice(text.autoFillPartial); }
    else setError(text.autoFillFailed);
  }

  function submit() {
    setConfirming(false); setError(null); setNotice(null);
    startTransition(async () => {
      const outcome = await completeSbcAction(challenge.key, placed.map((card) => card.id));
      if (outcome.error) setError(outcome.error);
      else setResult({ rewardMb: outcome.rewardMb ?? 0, rewardPack: outcome.rewardPack ?? null });
    });
  }

  if (result) return <div className="grid justify-items-center gap-4 rounded-2xl border border-lime-300/40 bg-lime-300/10 p-8 text-center">
    <b className="text-2xl font-black">{item?.title ?? challenge.key}</b>
    <p className="text-lg font-bold text-lime-300">{text.done(rewardText(t, result))}</p>
    <button type="button" onClick={onBack} className="rounded-lg bg-lime-300 px-5 py-2.5 font-black text-slate-950 hover:opacity-90">{text.doneButton}</button>
  </div>;

  const picking = pickingSlot === null ? null : { index: pickingSlot, position: slots[pickingSlot].position };
  const usedElsewhere = new Set(chosen.filter((card, index) => card && index !== pickingSlot).map((card) => card!.id));
  const available = cards.filter((card) => !usedElsewhere.has(card.id));
  const slotButton = (index: number) => {
    const card = chosen[index]; const position = slots[index].position;
    return <button key={index} type="button" onClick={() => setPickingSlot(index)} aria-label={card ? card.name : text.emptySlot} className={`h-[5.6rem] w-[4.3rem] shrink-0 rounded-xl transition hover:scale-105 ${card ? "" : "grid content-center justify-items-center border-2 border-dashed border-white/35 bg-black/25 text-white/70"}`}>
      {card ? <MiniCard card={card} /> : <><span className="text-2xl leading-none">+</span><span className="mt-1 text-[10px] font-black">{position ?? text.emptySlot}</span></>}
    </button>;
  };

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={onBack} className="text-sm font-bold text-white/60 hover:text-white">{text.back}</button>
      <div className="text-right"><b className="block text-xl font-black">{item?.title ?? challenge.key}</b><span className="text-sm text-white/60">{item?.description}</span></div>
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      {slots.every((slot) => slot.position)
        ? <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-emerald-900/60 to-emerald-950/80">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
          {slots.map((slot, index) => <div key={index} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>{slotButton(index)}</div>)}
        </div>
        : <div className="flex flex-wrap justify-center gap-3 rounded-2xl border border-white/10 bg-emerald-950/50 p-5">{slots.map((_, index) => slotButton(index))}</div>}
      <aside className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-end justify-between"><span className="text-[10px] font-bold tracking-widest text-white/45">{text.squadRating.toUpperCase()}</span><b className="text-3xl font-black text-lime-300">{placed.length ? teamRating(placed) : "—"}</b></div>
        <div className="grid gap-1.5"><span className="text-[10px] font-bold tracking-widest text-white/45">{text.requirements.toUpperCase()}</span>
          <ul className="grid gap-1.5 text-sm">
            <li className="flex items-center justify-between gap-2"><span>{t.sbc.cardCount(challenge.cardCount)}</span><b className={placed.length === challenge.cardCount ? "text-lime-300" : "text-white/55"}>{placed.length}/{challenge.cardCount}</b></li>
            {challenge.requirements.map((req, index) => {
              const status = requirementStatus(req, placed, challenge.cardCount);
              return <li key={index} className="flex items-center justify-between gap-2"><span>{requirementText(t, req)}</span><b className={status.met ? "text-lime-300" : "text-white/55"}>{status.met ? "✓" : req.type === "team_rating" ? status.current || "—" : `${status.current}/${status.needed}`}</b></li>;
            })}
          </ul>
        </div>
        <p className="border-t border-white/10 pt-3 text-sm"><span className="text-white/55">{t.sbc.reward}: </span><b className="text-cyan-300">{rewardText(t, challenge)}</b></p>
        {notice ? <p className="rounded-lg border border-amber-300/40 bg-amber-300/10 p-2.5 text-sm text-amber-100">{notice}</p> : null}
        {error ? <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 p-2.5 text-sm text-red-200">{error}</p> : null}
        <div className="grid gap-2">
          <button type="button" onClick={fill} title={text.autoFillHint} disabled={pending || cards.length === 0} className="rounded-lg border border-lime-300/60 px-4 py-2.5 font-black text-lime-300 hover:bg-lime-300/10 disabled:opacity-40">{text.autoFill}</button>
          <button type="button" onClick={() => { setChosen(slots.map(() => null)); setError(null); setNotice(null); }} disabled={pending || placed.length === 0} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-white/70 hover:text-white disabled:opacity-40">{text.clear}</button>
          <button type="button" onClick={() => setConfirming(true)} disabled={!satisfied || pending} className="rounded-lg bg-lime-300 px-4 py-3 font-black text-slate-950 hover:opacity-90 disabled:opacity-40">{pending ? text.submitting : text.submit}</button>
        </div>
      </aside>
    </div>
    {confirming ? <ConfirmDialog message={text.confirm(challenge.cardCount, rewardText(t, challenge))} onCancel={() => setConfirming(false)} onConfirm={submit} /> : null}
    {picking ? <CardPicker position={picking.position} cards={available} suggestions={suggestCards(available, challenge.requirements, challenge.cardCount, chosen.filter((card, index): card is SbcCard => Boolean(card) && index !== picking.index), picking.position)} current={chosen[picking.index]} onClose={() => setPickingSlot(null)} onPick={(card) => { setChosen((prev) => prev.map((slot, index) => (index === picking.index ? card : slot))); setPickingSlot(null); setError(null); setNotice(null); }} /> : null}
  </div>;
}

const britishNations: Record<string, string> = { "gb-eng": "England", "gb-sct": "Scotland", "gb-wls": "Wales", "gb-nir": "Northern Ireland" };
function nationName(locale: string, code: string) {
  if (britishNations[code]) return britishNations[code];
  try { return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code.toUpperCase(); } catch { return code.toUpperCase(); }
}

type PickerSort = "high" | "low" | "name";
const selectClass = "min-w-0 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs font-bold";

function CardPicker({ position, cards, suggestions, current, onPick, onClose }: { position: string | null; cards: SbcCard[]; suggestions: SbcCard[]; current: SbcCard | null; onPick: (card: SbcCard | null) => void; onClose: () => void }) {
  const t = useT(); const text = t.sbc.picker; const locale = useLocale();
  const [search, setSearch] = useState("");
  const [onlyPosition, setOnlyPosition] = useState(Boolean(position));
  const [sort, setSort] = useState<PickerSort>("low");
  const [league, setLeague] = useState(""); const [club, setClub] = useState(""); const [nation, setNation] = useState("");
  const [minRating, setMinRating] = useState(""); const [maxRating, setMaxRating] = useState("");
  const needle = search.trim().toLowerCase();
  // Valgene i nedtrekkslistene kommer fra kortene du faktisk har.
  const leagues = [...new Set(cards.map((card) => card.league))].sort((a, b) => (t.sbc.leagues[a] ?? a).localeCompare(t.sbc.leagues[b] ?? b, locale));
  const clubs = [...new Set(cards.map((card) => card.club).filter(Boolean))].sort((a, b) => a.localeCompare(b, locale));
  const nations = [...new Set(cards.map((card) => card.nation).filter((code): code is string => Boolean(code)))].sort((a, b) => nationName(locale, a).localeCompare(nationName(locale, b), locale));
  const min = minRating === "" ? null : Number(minRating); const max = maxRating === "" ? null : Number(maxRating);
  const list = cards
    .filter((card) => (!onlyPosition || !position || canPlayPosition(card.position, position)) && (!needle || card.name.toLowerCase().includes(needle))
      && (!league || card.league === league) && (!club || card.club === club) && (!nation || card.nation === nation)
      && (min === null || card.overall >= min) && (max === null || card.overall <= max))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, locale) : sort === "high" ? b.overall - a.overall : a.overall - b.overall) || a.name.localeCompare(b.name, locale));
  const filtered = Boolean(league || club || nation || minRating || maxRating);
  const reset = () => { setLeague(""); setClub(""); setNation(""); setMinRating(""); setMaxRating(""); };
  const showSuggestions = suggestions.length > 0 && !needle && !filtered;
  const row = (card: SbcCard, suggested: boolean) => <button type="button" onClick={() => onPick(card)} className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left hover:border-lime-300/60 ${suggested ? "border-lime-300/40 bg-lime-300/10" : "border-white/10 bg-white/5"}`}>
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg font-black text-white" style={{ background: `linear-gradient(145deg, ${card.accent}bb, #102b1a)` }}>{card.overall}</span>
    <span className="min-w-0 flex-1"><b className="block truncate text-sm">{card.name}</b><span className="block truncate text-xs text-white/55">{t.career.clubName(card.club)}</span></span>
    {card.onBench ? <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">{text.bench}</span> : null}
    <span className="text-xs font-black text-white/70">{card.position}</span>
  </button>;
  return <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={text.title(position)}>
    <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-white/15 bg-[#08101b] shadow-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4"><b className="text-lg font-black">{text.title(position)}</b><button type="button" onClick={onClose} className="text-sm font-bold text-white/60 hover:text-white">{text.close}</button></div>
      <div className="grid gap-2 border-b border-white/10 p-3">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.search} className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <select value={sort} onChange={(event) => setSort(event.target.value as PickerSort)} aria-label={text.sort} className={selectClass}><option value="low">{text.sortLow}</option><option value="high">{text.sortHigh}</option><option value="name">{text.sortName}</option></select>
          <select value={league} onChange={(event) => setLeague(event.target.value)} aria-label={text.allLeagues} className={selectClass}><option value="">{text.allLeagues}</option>{leagues.map((key) => <option key={key} value={key}>{t.sbc.leagues[key] ?? key}</option>)}</select>
          <select value={club} onChange={(event) => setClub(event.target.value)} aria-label={text.allClubs} className={selectClass}><option value="">{text.allClubs}</option>{clubs.map((name) => <option key={name} value={name}>{t.career.clubName(name)}</option>)}</select>
          <select value={nation} onChange={(event) => setNation(event.target.value)} aria-label={text.allNations} className={selectClass}><option value="">{text.allNations}</option>{nations.map((code) => <option key={code} value={code}>{nationName(locale, code)}</option>)}</select>
          <input type="number" inputMode="numeric" min={40} max={99} value={minRating} onChange={(event) => setMinRating(event.target.value)} placeholder={text.minRating} aria-label={text.minRating} className={selectClass} />
          <input type="number" inputMode="numeric" min={40} max={99} value={maxRating} onChange={(event) => setMaxRating(event.target.value)} placeholder={text.maxRating} aria-label={text.maxRating} className={selectClass} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {position ? <button type="button" onClick={() => setOnlyPosition((value) => !value)} className={`rounded-full px-3 py-1 text-xs font-black ${onlyPosition ? "bg-lime-300 text-slate-950" : "bg-white/10 text-white/70"}`}>{onlyPosition ? text.onlyPosition(position) : text.allPositions}</button> : null}
          {current ? <button type="button" onClick={() => onPick(null)} className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70 hover:text-white">{text.remove}</button> : null}
          {filtered ? <button type="button" onClick={reset} className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70 hover:text-white">{text.resetFilters}</button> : null}
          <span className="ml-auto text-xs font-bold text-white/45">{text.count(list.length)}</span>
        </div>
      </div>
      <div className="grid gap-1.5 overflow-y-auto p-3">
        {/* Forslagene vises bare når man ikke har søkt eller filtrert selv. */}
        {showSuggestions ? <><span className="text-[10px] font-bold tracking-widest text-lime-300">{text.suggestions.toUpperCase()}</span><ul className="grid gap-1.5">{suggestions.map((card) => <li key={card.id}>{row(card, true)}</li>)}</ul><span className="mt-2 text-[10px] font-bold tracking-widest text-white/45">{text.allCards.toUpperCase()}</span></> : null}
        <ul className="grid gap-1.5">
          {list.length === 0 ? <li className="p-4 text-center text-sm text-white/55">{text.empty}</li> : list.map((card) => <li key={card.id}>{row(card, false)}</li>)}
        </ul>
      </div>
    </div>
  </div>;
}
