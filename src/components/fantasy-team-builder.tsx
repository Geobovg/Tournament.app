"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useLocale, useT } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";
import { clubCode } from "@/lib/fantasy/club-codes";
import { FANTASY_COMPETITIONS, type CompetitionCode } from "@/lib/fantasy/competitions";
import type { ChipState, ClubFixture, FantasyPlayerOption, FantasyTeam } from "@/lib/fantasy/data";
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
import { BenchSlot, EmptyPitchSlot, FantasyPitch, FantasyPlayerCard, FantasyPlayerPhoto, PitchRow } from "./fantasy-pitch";
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

// «ARS (H), CHE (B)» – kampene klubben har i runden, som under kortene i FPL.
function fixtureText(t: Dictionary, fixtures: ClubFixture[] | undefined) {
  return fixtures?.length ? fixtures.map((fixture) => t.fantasy.playerInfo.fixture(clubCode(fixture.opponent), fixture.home)).join(", ") : "–";
}

export function FantasyTeamBuilder({ players, team, round, fixtures }: { players: FantasyPlayerOption[]; team: FantasyTeam | null; round: number | null; fixtures: Record<number, ClubFixture[]> }) {
  const t = useT();
  const text = t.fantasy;
  const locale = useLocale();
  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const [name, setName] = useState(team?.name ?? "");
  const [squadIds, setSquadIds] = useState<number[]>(() => (team ? [...team.starters, ...team.bench].filter((id) => byId.has(id)) : []));
  const [lineup, setLineup] = useState<Lineup | null>(team);
  // selected er spilleren man bytter fra (etter «Bytt»), infoId spilleren i infovinduet.
  const [selected, setSelected] = useState<number | null>(null);
  const [infoId, setInfoId] = useState<number | null>(null);
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

  // Spillerlista scroller inni seg selv, og flere spillere lastes inn når man nærmer seg bunnen.
  const listRef = useRef<HTMLDivElement>(null);
  function loadMoreNearBottom() {
    const list = listRef.current;
    if (list && filtered.length > visible && list.scrollTop + list.clientHeight > list.scrollHeight - 300) setVisible(visible + PAGE_SIZE);
  }
  useEffect(() => { listRef.current?.scrollTo({ top: 0 }); }, [search, position, league, sort]);

  function changeSquad(next: number[]) {
    // Den gjeldende oppstillingen tas vare på, så den kan repareres når troppen er full igjen.
    if (activeLineup) setLineup(activeLineup);
    setSquadIds(next);
    setSelected(null);
    setInfoId(null);
    setResult(null);
  }

  function cantAddReason(player: FantasyPlayerOption) {
    if (squad.filter((picked) => picked.position === player.position).length >= SQUAD_SHAPE[player.position]) return text.cantAdd.positionFull;
    if (squad.filter((picked) => picked.clubId === player.clubId).length >= MAX_PER_CLUB) return text.cantAdd.clubFull;
    return text.cantAdd.tooExpensive;
  }

  // Trykk på en spiller for å åpne infovinduet. Etter «Bytt» der bytter neste trykk plass på
  // de to (startellever/benk, eller rekkefølgen på benken).
  function tapPlayer(id: number) {
    setResult(null);
    if (!activeLineup || selected === null || selected === id) {
      setSelected(null);
      setInfoId(id);
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
    setInfoId(null);
    setResult(null);
  }

  function startSwitch(id: number) {
    setSelected(id);
    setInfoId(null);
  }

  // Om spilleren man bytter fra kan bytte plass med id uten at formasjonen blir ugyldig.
  function canSwitchWith(id: number) {
    if (!activeLineup || selected === null) return false;
    const swap = (list: number[]) => list.map((item) => (item === selected ? id : item === id ? selected : item));
    return lineupProblems(squad, { ...activeLineup, starters: swap(activeLineup.starters), bench: swap(activeLineup.bench) }).every((problem) => problem.type !== "formation");
  }

  function save() {
    if (!activeLineup) return;
    startTransition(async () => setResult(await saveFantasyTeamAction({ name, ...activeLineup })));
  }

  // Med full tropp viser kortet rundens kamper (som «Velg lag» i FPL), ellers prisen (som «Bytter»).
  const chip = (player: FantasyPlayerOption) => (
    <FantasyPlayerCard
      key={player.id}
      player={player}
      info={activeLineup ? fixtureText(t, fixtures[player.clubId]) : text.money(formatPrice(player.price, locale))}
      selected={selected === player.id}
      dimmed={selected !== null && selected !== player.id && !canSwitchWith(player.id)}
      badge={activeLineup?.captainId === player.id ? text.captainShort : activeLineup?.viceCaptainId === player.id ? text.viceCaptainShort : null}
      onTap={() => tapPlayer(player.id)}
    />
  );
  const switchingPlayer = selected === null ? null : byId.get(selected) ?? null;
  const infoPlayer = infoId === null ? null : byId.get(infoId) ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <section className="grid min-w-0 content-start gap-4">
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

        {switchingPlayer ? (
          <div className={`${cardClass} flex flex-wrap items-center gap-2 border-yellow-400`}>
            <p className="mr-auto text-sm font-semibold">{text.playerInfo.switching(switchingPlayer.name)}</p>
            <button type="button" onClick={() => setSelected(null)} className={secondaryButtonClass}>{text.playerInfo.cancelSwitch}</button>
          </div>
        ) : null}

        {activeLineup ? (
          <FantasyPitch bench={<>
            <p className="text-center text-xs font-bold tracking-widest text-white/70">{text.bench.toUpperCase()}</p>
            <PitchRow>{activeLineup.bench.map((id, index) => {
              const benchPosition = positionOf(id)!;
              const order = activeLineup.bench.slice(0, index + 1).filter((other) => positionOf(other) !== "GK").length;
              return <BenchSlot key={id} label={benchPosition === "GK" ? text.positionShort.GK : `${order}. ${text.positionShort[benchPosition]}`}>{chip(byId.get(id)!)}</BenchSlot>;
            })}</PitchRow>
          </>}>
            {FANTASY_POSITIONS.map((row) => <PitchRow key={row}>{activeLineup.starters.flatMap((id) => (positionOf(id) === row ? [chip(byId.get(id)!)] : []))}</PitchRow>)}
          </FantasyPitch>
        ) : (
          <FantasyPitch>
            {FANTASY_POSITIONS.map((row) => {
              const inRow = squad.filter((player) => player.position === row);
              return (
                <PitchRow key={row}>
                  {inRow.map(chip)}
                  {Array.from({ length: SQUAD_SHAPE[row] - inRow.length }, (_, index) => <EmptyPitchSlot key={`${row}-${index}`} label={text.positionShort[row]} />)}
                </PitchRow>
              );
            })}
          </FantasyPitch>
        )}
        {activeLineup && !locked ? <p className="text-center text-xs text-muted">{text.swapHint}</p> : null}

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

      <section className={`${cardClass} flex h-[75dvh] min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:self-start`}>
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
        <div ref={listRef} onScroll={loadMoreNearBottom} className="-mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
        {filtered.length === 0 ? <p className="text-sm text-muted">{text.noPlayers}</p> : null}
        <ul className="grid grid-cols-1 gap-1">
          {filtered.slice(0, visible).map((player) => {
            const picked = squadIds.includes(player.id);
            const addable = canAddPlayer(squad, { ...player, price: costOf(player) }, budget);
            return (
              <li key={player.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 sm:gap-3 sm:px-2 hover:bg-surface-raised">
                <button type="button" onClick={() => { setSelected(null); setInfoId(player.id); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <FantasyPlayerPhoto photo={player.photo} photoCutout={player.photoCutout} avatar className="h-10 w-10 shrink-0 border border-border" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5"><Crest src={player.crest} small /><span className="truncate font-medium">{player.name}</span></span>
                    <span className="block truncate text-xs text-muted">{text.positionShort[player.position]} · {player.clubName} · {text.pointsShort(player.points)}</span>
                  </span>
                </button>
                <span className="text-sm font-semibold tabular-nums">
                  {player.priceChange > 0 ? <span className="mr-1 text-emerald-500" title={text.priceUp}>▲</span> : player.priceChange < 0 ? <span className="mr-1 text-red-500" title={text.priceDown}>▼</span> : null}
                  {text.money(formatPrice(player.price, locale))}
                </span>
                {locked ? null : picked ? (
                  <button type="button" onClick={() => changeSquad(squadIds.filter((id) => id !== player.id))} aria-label={text.remove(player.name)} className="w-12 rounded-lg border border-border px-2 py-1 text-sm sm:w-16">✕</button>
                ) : (
                  <button type="button" onClick={() => changeSquad([...squadIds, player.id])} disabled={!addable} title={addable ? undefined : cantAddReason(player)} className="w-12 rounded-lg bg-accent px-1 py-1 text-sm font-medium text-accent-contrast disabled:opacity-40 sm:w-16 sm:px-2">{text.add}</button>
                )}
              </li>
            );
          })}
        </ul>
        </div>
      </section>

      {infoPlayer ? (
        <PlayerInfoDialog player={infoPlayer} fixtures={fixtures[infoPlayer.clubId] ?? []} sellingPrice={purchasePrices[infoPlayer.id] === undefined ? null : costOf(infoPlayer)} onClose={() => setInfoId(null)}>
          {locked ? null : squadIds.includes(infoPlayer.id) ? (
            <>
              {activeLineup ? <button type="button" onClick={() => startSwitch(infoPlayer.id)} className={buttonClass}>{text.playerInfo.switch}</button> : null}
              {activeLineup?.starters.includes(infoPlayer.id) && activeLineup.captainId !== infoPlayer.id ? <button type="button" onClick={() => setCaptain(infoPlayer.id, "captain")} className={secondaryButtonClass}>{text.captain}</button> : null}
              {activeLineup?.starters.includes(infoPlayer.id) && activeLineup.viceCaptainId !== infoPlayer.id ? <button type="button" onClick={() => setCaptain(infoPlayer.id, "vice")} className={secondaryButtonClass}>{text.viceCaptain}</button> : null}
              <button type="button" onClick={() => changeSquad(squadIds.filter((id) => id !== infoPlayer.id))} className={secondaryButtonClass}>{text.remove(infoPlayer.name)}</button>
            </>
          ) : canAddPlayer(squad, { ...infoPlayer, price: costOf(infoPlayer) }, budget) ? (
            <button type="button" onClick={() => changeSquad([...squadIds, infoPlayer.id])} className={buttonClass}>{text.add}</button>
          ) : <p className="text-sm text-muted">{cantAddReason(infoPlayer)}</p>}
        </PlayerInfoDialog>
      ) : null}
    </div>
  );
}

// Infovinduet når man trykker på en spiller, som i FPL: stort bilde, klubb, pris, poeng og rundens kamper.
function PlayerInfoDialog({ player, fixtures, sellingPrice, onClose, children }: { player: FantasyPlayerOption; fixtures: ClubFixture[]; sellingPrice: number | null; onClose: () => void; children: ReactNode }) {
  const t = useT();
  const text = t.fantasy;
  const locale = useLocale();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const competition = FANTASY_COMPETITIONS.find((item) => item.code === player.competition)?.name;
  const time = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" });
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={player.name} onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-end gap-4 bg-gradient-to-br from-emerald-700 to-emerald-950 px-4 pt-4 text-white">
          <FantasyPlayerPhoto photo={player.photo} photoCutout={player.photoCutout} className="h-28 w-28 shrink-0 sm:h-32 sm:w-32" />
          <div className="min-w-0 flex-1 pb-3">
            <p className="text-xs font-bold tracking-widest text-white/70">{text.positions[player.position].toUpperCase()}</p>
            <p className="text-xl font-black leading-tight">{player.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85"><Crest src={player.crest} small />{player.clubName}</p>
            {competition ? <p className="text-xs text-white/60">{competition}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={text.playerInfo.close} className="mb-auto rounded-full bg-black/30 px-2.5 py-1 text-sm font-bold hover:bg-black/50">✕</button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
          <div className="p-3">
            <p className="text-xs text-muted">{text.playerInfo.price}</p>
            <p className="font-bold tabular-nums">
              {player.priceChange > 0 ? <span className="mr-1 text-emerald-500" title={text.priceUp}>▲</span> : player.priceChange < 0 ? <span className="mr-1 text-red-500" title={text.priceDown}>▼</span> : null}
              {text.money(formatPrice(player.price, locale))}
            </p>
          </div>
          <div className="p-3"><p className="text-xs text-muted">{text.playerInfo.sellingPrice}</p><p className="font-bold tabular-nums">{sellingPrice === null ? "–" : text.money(formatPrice(sellingPrice, locale))}</p></div>
          <div className="p-3"><p className="text-xs text-muted">{text.playerInfo.totalPoints}</p><p className="font-bold tabular-nums">{player.points}</p></div>
        </div>
        <div className="grid gap-2 p-4">
          <p className={labelClass}>{text.playerInfo.thisRound}</p>
          {fixtures.length ? (
            <ul className="grid gap-1.5 text-sm">
              {fixtures.map((fixture) => (
                <li key={fixture.kickoffAt + fixture.opponent} className="flex items-center gap-2">
                  <Crest src={fixture.opponentCrest} />
                  <span className="font-medium">{text.playerInfo.fixture(fixture.opponent, fixture.home)}</span>
                  <span className="ml-auto text-xs text-muted">{time.format(new Date(fixture.kickoffAt))}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">{text.playerInfo.noMatch}</p>}
        </div>
        {children ? <div className="flex flex-wrap items-center gap-2 border-t border-border p-4">{children}</div> : null}
      </div>
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

function Crest({ src, small = false }: { src: string | null; small?: boolean }) {
  const size = small ? "h-4 w-4 text-xs" : "h-6 w-6 text-sm";
  return src ? <Image src={src} alt="" width={24} height={24} className={`${size} shrink-0 object-contain`} /> : <span className={`grid ${size} shrink-0 place-items-center`}>⚽</span>;
}
