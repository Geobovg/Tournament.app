"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useLocale, useT } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";
import { FANTASY_COMPETITIONS, type CompetitionCode } from "@/lib/fantasy/competitions";
import type { ChipState, FantasyPlayerOption, FantasyTeam } from "@/lib/fantasy/data";
import type { Chip } from "@/lib/fantasy/points";
import { formatPrice } from "@/lib/fantasy/pricing";
import {
  FANTASY_POSITIONS,
  MAX_PER_CLUB,
  SQUAD_SHAPE,
  SQUAD_SIZE,
  availableMoney,
  canAddPlayer,
  defaultLineup,
  lineupProblems,
  sellingPrice,
  squadCost,
  squadProblems,
  type FantasyPosition,
  type Lineup,
} from "@/lib/fantasy/squad-rules";
import { saveFantasyTeamAction, setFantasyChipAction } from "@/lib/fantasy-actions";
import { buttonClass, cardClass, labelClass, secondaryButtonClass } from "./ui";

const PAGE_SIZE = 40;
const TRANSFER_COST = 4;
const inputClass = "w-full rounded-lg border border-border bg-surface px-3 py-2";
type Sort = "price" | "points" | "cheapest";

// Når en spiller byttes ut med en annen på samme posisjon, tar den nye plassen
// (og kapteinsbindet) til den gamle, så resten av oppstillingen beholdes.
function repairLineup(lineup: Lineup, squadIds: number[], positionOf: (id: number) => FantasyPosition | undefined): Lineup | null {
  const inLineup = [...lineup.starters, ...lineup.bench];
  const missing = inLineup.filter((id) => !squadIds.includes(id));
  const extra = squadIds.filter((id) => !inLineup.includes(id));
  if (missing.length !== extra.length) return null;
  const replacement = new Map<number, number>();
  const unused = [...extra];
  for (const id of missing) {
    const index = unused.findIndex((candidate) => positionOf(candidate) === positionOf(id));
    if (index === -1) return null;
    replacement.set(id, unused.splice(index, 1)[0]);
  }
  const swap = (id: number) => replacement.get(id) ?? id;
  return { starters: lineup.starters.map(swap), bench: lineup.bench.map(swap), captainId: swap(lineup.captainId), viceCaptainId: swap(lineup.viceCaptainId) };
}

function problemTexts(t: Dictionary, squad: FantasyPlayerOption[], budget: number, lineup: Lineup | null, locale: string) {
  const text = t.fantasy.problems;
  const texts = squadProblems(squad, budget).flatMap((problem) => {
    switch (problem.type) {
      case "position": return [text.position(t.fantasy.positions[problem.position], problem.have, problem.need)];
      case "budget": return [text.budget(formatPrice(problem.over, locale))];
      case "club": return [text.club(squad.find((player) => player.clubId === problem.clubId)?.clubName ?? "")];
      case "duplicate": return [];
    }
  });
  if (!lineup) return texts;
  return [...texts, ...lineupProblems(squad, lineup).flatMap((problem) => {
    switch (problem.type) {
      case "formation": return [text.formation(t.fantasy.positions[problem.position], problem.min, problem.max)];
      case "captain": return [text.captain];
      default: return [];
    }
  })];
}

export function FantasyTeamBuilder({ players, team, round }: { players: FantasyPlayerOption[]; team: FantasyTeam | null; round: number | null }) {
  const t = useT();
  const text = t.fantasy;
  const locale = useLocale();
  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const [name, setName] = useState(team?.name ?? "");
  const [squadIds, setSquadIds] = useState<number[]>(() => (team ? [...team.starters, ...team.bench].filter((id) => byId.has(id)) : []));
  const [lineup, setLineup] = useState<Lineup | null>(team);
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<FantasyPosition | "all">("all");
  const [league, setLeague] = useState<CompetitionCode | "all">("all");
  const [sort, setSort] = useState<Sort>("price");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [result, setResult] = useState<{ error?: string; ok?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = Boolean(team?.freeHitActive) || round === null;

  // Penger som i save_fantasy_team: banken + salgsverdien av spillerne man eier. Spillere man
  // beholder koster salgsverdien sin, nye spillere dagens pris.
  const purchasePrices = team?.purchasePrices ?? {};
  const costOf = (player: FantasyPlayerOption) => (purchasePrices[player.id] === undefined ? player.price : sellingPrice(purchasePrices[player.id], player.price));
  const budget = availableMoney(team?.bank ?? null, Object.entries(purchasePrices).flatMap(([id, purchase]) => (byId.has(Number(id)) ? [{ purchase, current: byId.get(Number(id))!.price }] : [])));
  const squad = squadIds.flatMap((id) => (byId.has(id) ? [{ ...byId.get(id)!, price: costOf(byId.get(id)!) }] : []));
  const complete = squad.length === SQUAD_SIZE && squadProblems(squad, budget).length === 0;
  const positionOf = (id: number) => byId.get(id)?.position;
  // Oppstillingen gjelder bare når troppen er full. Passer den ikke, lages en ny.
  const activeLineup = complete ? (lineup && lineupProblems(squad, lineup).every((problem) => problem.type !== "notInSquad") ? lineup : (lineup && repairLineup(lineup, squadIds, positionOf)) ?? defaultLineup(squad)) : null;
  const problems = problemTexts(t, squad, budget, activeLineup, locale);
  const moneyLeft = budget - squadCost(squad);

  // Bytter siden laget sist ble låst, som lock_fantasy_round teller dem.
  const hasPlayedRound = (team?.lockedSquad.length ?? 0) > 0;
  const transfers = hasPlayedRound ? squadIds.filter((id) => !team!.lockedSquad.includes(id)).length : 0;
  const freeChip = team?.pendingChip === "wildcard" || team?.pendingChip === "free_hit";
  const transferCost = hasPlayedRound && !freeChip ? Math.max(0, transfers - team!.freeTransfers) * TRANSFER_COST : 0;

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const list = players.filter((player) =>
      (position === "all" || player.position === position) &&
      (league === "all" || player.competition === league) &&
      (!query || player.name.toLocaleLowerCase().includes(query) || player.clubName.toLocaleLowerCase().includes(query)));
    if (sort === "points") return [...list].sort((a, b) => b.points - a.points || b.price - a.price);
    if (sort === "cheapest") return [...list].sort((a, b) => a.price - b.price || b.points - a.points);
    return list;
  }, [players, search, position, league, sort]);

  function changeSquad(next: number[]) {
    // Den gjeldende oppstillingen tas vare på, så den kan repareres når troppen er full igjen.
    if (activeLineup) setLineup(activeLineup);
    setSquadIds(next);
    setSelected(null);
    setResult(null);
  }

  function cantAddReason(player: FantasyPlayerOption) {
    if (squad.filter((picked) => picked.position === player.position).length >= SQUAD_SHAPE[player.position]) return text.cantAdd.positionFull;
    if (squad.filter((picked) => picked.clubId === player.clubId).length >= MAX_PER_CLUB) return text.cantAdd.clubFull;
    return text.cantAdd.tooExpensive;
  }

  // Trykk på én spiller og så en annen for å bytte dem (startellever/benk, eller rekkefølgen på benken).
  function tapPlayer(id: number) {
    setResult(null);
    if (!activeLineup || selected === null || selected === id) {
      setSelected(selected === id ? null : id);
      return;
    }
    const swap = (list: number[]) => list.map((item) => (item === selected ? id : item === id ? selected : item));
    const next = { ...activeLineup, starters: swap(activeLineup.starters), bench: swap(activeLineup.bench) };
    // En kaptein som havner på benken gir bindet videre til spilleren som kom inn.
    if (!next.starters.includes(next.captainId)) next.captainId = next.starters.includes(id) ? id : selected;
    if (!next.starters.includes(next.viceCaptainId)) next.viceCaptainId = next.starters.includes(id) ? id : selected;
    const formationOk = lineupProblems(squad, next).every((problem) => problem.type !== "formation");
    if (formationOk) setLineup(next);
    setSelected(null);
  }

  function setCaptain(id: number, role: "captain" | "vice") {
    if (!activeLineup) return;
    const next = { ...activeLineup };
    if (role === "captain") {
      if (next.viceCaptainId === id) next.viceCaptainId = next.captainId;
      next.captainId = id;
    } else {
      if (next.captainId === id) next.captainId = next.viceCaptainId;
      next.viceCaptainId = id;
    }
    setLineup(next);
    setSelected(null);
    setResult(null);
  }

  function save() {
    if (!activeLineup) return;
    startTransition(async () => setResult(await saveFantasyTeamAction({ name, ...activeLineup })));
  }

  const chip = (player: FantasyPlayerOption) => (
    <PlayerChip
      key={player.id}
      player={player}
      price={text.money(formatPrice(player.price, locale))}
      selected={selected === player.id}
      badge={activeLineup?.captainId === player.id ? text.captainShort : activeLineup?.viceCaptainId === player.id ? text.viceCaptainShort : null}
      onTap={() => (locked ? undefined : tapPlayer(player.id))}
    />
  );
  const emptySlot = (key: string) => <span key={key} className="grid h-20 w-[3.75rem] place-items-center rounded-xl border border-dashed border-white/30 text-[10px] text-white/50 sm:h-24 sm:w-24 sm:text-xs">{text.emptySlot}</span>;
  const selectedPlayer = selected === null ? null : byId.get(selected) ?? null;
  const selectedIsStarter = selected !== null && Boolean(activeLineup?.starters.includes(selected));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <section className="grid content-start gap-4">
        {team?.freeHitActive ? <p className={`${cardClass} text-sm`}>{text.freeHitActive}</p> : null}
        <div className={`${cardClass} grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end`}>
          <label className="grid gap-1">
            <span className={labelClass}>{text.teamName}</span>
            <input value={name} disabled={locked} onChange={(event) => { setName(event.target.value); setResult(null); }} maxLength={30} placeholder={text.teamNamePlaceholder} className={inputClass} />
          </label>
          <div><p className={labelClass}>{text.budgetLeft}</p><p className={`text-xl font-bold ${moneyLeft < 0 ? "text-red-500" : ""}`}>{text.money(formatPrice(moneyLeft, locale))}</p></div>
          <div><p className={labelClass}>{text.players}</p><p className="text-xl font-bold">{squad.length}/{SQUAD_SIZE}</p></div>
          <div className="text-sm text-muted sm:col-span-3">
            <span className="font-semibold text-foreground">{text.transfers.title}: </span>
            {!hasPlayedRound ? text.transfers.unlimited
              : freeChip ? `${text.transfers.made(transfers)} · ${text.transfers.chipFree}`
              : `${text.transfers.made(transfers)} · ${text.transfers.free(team!.freeTransfers)} · ${transferCost ? text.transfers.cost(transferCost) : text.transfers.noCost}`}
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-emerald-900/40 bg-gradient-to-b from-emerald-700 to-emerald-900 p-2 text-white sm:p-4">
          {activeLineup ? (
            <>
              {FANTASY_POSITIONS.map((row) => (
                <div key={row} className="flex flex-wrap justify-center gap-1 sm:gap-2">
                  {activeLineup.starters.flatMap((id) => (positionOf(id) === row ? [chip(byId.get(id)!)] : []))}
                </div>
              ))}
              <div className="mt-2 grid gap-2 rounded-xl bg-black/25 p-2 sm:p-3">
                <p className="text-xs font-bold tracking-widest text-white/70">{text.bench.toUpperCase()}</p>
                <div className="flex flex-wrap justify-center gap-1 sm:gap-2">{activeLineup.bench.map((id) => chip(byId.get(id)!))}</div>
              </div>
              {!locked ? <p className="text-center text-xs text-white/70">{text.swapHint}</p> : null}
            </>
          ) : (
            FANTASY_POSITIONS.map((row) => {
              const inRow = squad.filter((player) => player.position === row);
              return (
                <div key={row} className="grid gap-2">
                  <p className="text-xs font-bold tracking-widest text-white/70">{text.positions[row].toUpperCase()}</p>
                  <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                    {inRow.map(chip)}
                    {Array.from({ length: SQUAD_SHAPE[row] - inRow.length }, (_, index) => emptySlot(`${row}-${index}`))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedPlayer && !locked ? (
          <div className={`${cardClass} flex flex-wrap items-center gap-2`}>
            <p className="mr-auto font-semibold">{selectedPlayer.name}</p>
            {selectedIsStarter ? <button type="button" onClick={() => setCaptain(selectedPlayer.id, "captain")} className={secondaryButtonClass}>{text.captain}</button> : null}
            {selectedIsStarter ? <button type="button" onClick={() => setCaptain(selectedPlayer.id, "vice")} className={secondaryButtonClass}>{text.viceCaptain}</button> : null}
            <button type="button" onClick={() => changeSquad(squadIds.filter((id) => id !== selectedPlayer.id))} className={secondaryButtonClass}>{text.remove(selectedPlayer.name)}</button>
          </div>
        ) : null}

        {problems.length ? <ul className="grid gap-1 text-sm text-muted">{problems.map((problem) => <li key={problem}>• {problem}</li>)}</ul> : null}
        {!locked ? (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={!activeLineup || problems.length > 0 || !name.trim() || pending} className={buttonClass}>{pending ? text.saving : text.save}</button>
            {result?.ok ? <p className="text-sm font-medium text-emerald-600">{text.saved}</p> : null}
            {result?.error ? <p className="text-sm font-medium text-red-500">{result.error}</p> : null}
          </div>
        ) : null}

        {team && !team.freeHitActive && round !== null ? <FantasyChips chips={team.chips} /> : null}
      </section>

      <section className={`${cardClass} grid content-start gap-3`}>
        <input value={search} onChange={(event) => { setSearch(event.target.value); setVisible(PAGE_SIZE); }} placeholder={text.search} className={inputClass} />
        <div className="grid grid-cols-2 gap-2">
          <select value={position} onChange={(event) => { setPosition(event.target.value as FantasyPosition | "all"); setVisible(PAGE_SIZE); }} className={inputClass}>
            <option value="all">{text.allPositions}</option>
            {FANTASY_POSITIONS.map((item) => <option key={item} value={item}>{text.positions[item]}</option>)}
          </select>
          <select value={league} onChange={(event) => { setLeague(event.target.value as CompetitionCode | "all"); setVisible(PAGE_SIZE); }} className={inputClass}>
            <option value="all">{text.allLeagues}</option>
            {FANTASY_COMPETITIONS.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
          <select value={sort} onChange={(event) => { setSort(event.target.value as Sort); setVisible(PAGE_SIZE); }} className={`${inputClass} col-span-2`}>
            <option value="price">{text.sort.price}</option>
            <option value="points">{text.sort.points}</option>
            <option value="cheapest">{text.sort.cheapest}</option>
          </select>
        </div>
        {filtered.length === 0 ? <p className="text-sm text-muted">{text.noPlayers}</p> : null}
        <ul className="grid gap-1">
          {filtered.slice(0, visible).map((player) => {
            const picked = squadIds.includes(player.id);
            const addable = canAddPlayer(squad, { ...player, price: costOf(player) }, budget);
            return (
              <li key={player.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-raised">
                <Crest src={player.crest} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{player.name}</p>
                  <p className="truncate text-xs text-muted">{text.positionShort[player.position]} · {player.clubName} · {text.pointsShort(player.points)}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {player.priceChange > 0 ? <span className="mr-1 text-emerald-500" title={text.priceUp}>▲</span> : player.priceChange < 0 ? <span className="mr-1 text-red-500" title={text.priceDown}>▼</span> : null}
                  {text.money(formatPrice(player.price, locale))}
                </span>
                {locked ? null : picked ? (
                  <button type="button" onClick={() => changeSquad(squadIds.filter((id) => id !== player.id))} aria-label={text.remove(player.name)} className="w-16 rounded-lg border border-border px-2 py-1 text-sm">✕</button>
                ) : (
                  <button type="button" onClick={() => changeSquad([...squadIds, player.id])} disabled={!addable} title={addable ? undefined : cantAddReason(player)} className="w-16 rounded-lg bg-accent px-2 py-1 text-sm font-medium text-accent-contrast disabled:opacity-40">{text.add}</button>
                )}
              </li>
            );
          })}
        </ul>
        {filtered.length > visible ? <button type="button" onClick={() => setVisible(visible + PAGE_SIZE)} className={secondaryButtonClass}>{text.showMore}</button> : null}
      </section>
    </div>
  );
}

function FantasyChips({ chips }: { chips: ChipState[] }) {
  const text = useT().fantasy.chips;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const active = chips.some((chip) => chip.state === "active");
  const set = (chip: Chip | null) => startTransition(async () => { const result = await setFantasyChipAction(chip); setError(result.error ?? null); });
  return (
    <div className={`${cardClass} grid gap-3`}>
      <div><h2 className="font-semibold">{text.title}</h2><p className="text-sm text-muted">{text.intro}</p></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {chips.map(({ chip, state }) => (
          <div key={chip} className={`grid gap-2 rounded-lg border p-3 ${state === "active" ? "border-accent" : "border-border"}`}>
            <div><p className="font-medium">{text.names[chip]}</p><p className="text-xs text-muted">{text.descriptions[chip]}</p></div>
            {state === "active" ? (
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-accent">{text.active}</span><button type="button" disabled={pending} onClick={() => set(null)} className={secondaryButtonClass}>{text.cancel}</button></div>
            ) : state === "available" ? (
              <button type="button" disabled={pending || active} onClick={() => set(chip)} className={secondaryButtonClass}>{text.use}</button>
            ) : (
              <span className="text-xs text-muted">{state === "used" ? text.used : text.tooEarly}</span>
            )}
          </div>
        ))}
      </div>
      {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
    </div>
  );
}

function Crest({ src }: { src: string | null }) {
  return src ? <Image src={src} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" /> : <span className="grid h-6 w-6 shrink-0 place-items-center text-sm">⚽</span>;
}

function PlayerChip({ player, price, selected, badge, onTap }: { player: FantasyPlayerOption; price: string; selected: boolean; badge: string | null; onTap: () => void }) {
  return (
    <button type="button" onClick={onTap} className={`relative grid h-20 w-[3.75rem] content-center justify-items-center gap-1 rounded-xl border bg-black/25 px-0.5 text-center transition sm:h-24 sm:w-24 sm:px-1 ${selected ? "border-yellow-300 ring-2 ring-yellow-300" : "border-white/25 hover:border-white/60"}`}>
      {badge ? <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-yellow-300 text-[10px] font-black text-slate-950">{badge}</span> : null}
      <Crest src={player.crest} />
      <span className="w-full truncate text-[10px] font-bold sm:text-xs">{player.name}</span>
      <span className="text-[10px] text-white/75 sm:text-[11px]">{price}</span>
    </button>
  );
}
