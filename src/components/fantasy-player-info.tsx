"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { useLocale, useT } from "@/i18n/client";
import { clubCode } from "@/lib/fantasy/club-codes";
import { FANTASY_COMPETITIONS } from "@/lib/fantasy/competitions";
import type { FantasyPlayerDetails, FantasyPlayerOption, PlayerResult } from "@/lib/fantasy/data";
import { formatPrice } from "@/lib/fantasy/pricing";
import { getFantasyPlayerDetailsAction } from "@/lib/fantasy-actions";
import { FantasyPlayerCard, FantasyPlayerPhoto } from "./fantasy-pitch";

export function Crest({ src, small = false }: { src: string | null; small?: boolean }) {
  const size = small ? "h-4 w-4 text-xs" : "h-6 w-6 text-sm";
  return src ? <Image src={src} alt="" width={24} height={24} className={`${size} shrink-0 object-contain`} /> : <span className={`grid ${size} shrink-0 place-items-center`}>⚽</span>;
}

// Kampene hentes når vinduet åpnes, og huskes så samme spiller ikke hentes på nytt.
const detailsCache = new Map<number, Promise<FantasyPlayerDetails | null>>();
function loadDetails(playerId: number) {
  let pending = detailsCache.get(playerId);
  if (!pending) {
    pending = getFantasyPlayerDetailsAction(playerId);
    detailsCache.set(playerId, pending);
    pending.catch(() => detailsCache.delete(playerId));
  }
  return pending;
}

type Column = keyof PlayerResult & keyof ReturnType<typeof useT>["fantasy"]["playerInfo"]["columns"];
// Kolonnene i Resultater etter runde og motstander, i samme rekkefølge som i FPL.
const RESULT_COLUMNS: Column[] = ["points", "minutes", "goals", "assists", "cleanSheet", "goalsConceded", "ownGoals", "penaltiesSaved", "penaltiesMissed", "yellowCards", "redCards", "saves", "defensiveContribution", "bonus"];

// Infovinduet når man trykker på en spiller, som i FPL: stort bilde, klubb, pris, form og poeng
// med plassering blant spillerne på samme posisjon, og fanene Kamper og Resultater.
export function PlayerInfoDialog({ player, onClose, children }: { player: FantasyPlayerOption; onClose: () => void; children?: ReactNode }) {
  const t = useT();
  const text = t.fantasy;
  const info = text.playerInfo;
  const locale = useLocale();
  const [tab, setTab] = useState<"fixtures" | "results">("fixtures");
  const [details, setDetails] = useState<{ id: number; data: FantasyPlayerDetails | null; failed: boolean } | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    let current = true;
    loadDetails(player.id).then(
      (data) => { if (current) setDetails({ id: player.id, data, failed: false }); },
      () => { if (current) setDetails({ id: player.id, data: null, failed: true }); },
    );
    return () => { current = false; };
  }, [player.id]);
  const loaded = details?.id === player.id ? details : null;
  const competition = FANTASY_COMPETITIONS.find((item) => item.code === player.competition)?.name;
  const time = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" });
  const stat = (label: string, value: ReactNode, rank: number) => (
    <div className="p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted tabular-nums">{info.rank(rank, player.ranks.of)}</p>
    </div>
  );
  const tabClass = (active: boolean) => `flex-1 border-b-2 px-3 py-2 text-sm font-semibold transition ${active ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"}`;
  const cell = "px-2 py-1.5 text-center tabular-nums";

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={player.name} onClick={onClose}>
      <div className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-end gap-4 bg-gradient-to-br from-emerald-700 to-emerald-950 px-4 pt-4 text-white">
          <FantasyPlayerPhoto photo={player.photo} photoCutout={player.photoCutout} className="h-28 w-28 shrink-0 sm:h-32 sm:w-32" />
          <div className="min-w-0 flex-1 pb-3">
            <p className="text-xs font-bold tracking-widest text-white/70">{text.positions[player.position].toUpperCase()}</p>
            <p className="text-xl font-black leading-tight">{player.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85"><Crest src={player.crest} small />{player.clubName}</p>
            {competition ? <p className="text-xs text-white/60">{competition}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={info.close} className="mb-auto rounded-full bg-black/30 px-2.5 py-1 text-sm font-bold hover:bg-black/50">✕</button>
        </div>
        <div className="grid shrink-0 grid-cols-3 divide-x divide-border border-b border-border text-center">
          {stat(info.price, <>
            {player.priceChange > 0 ? <span className="mr-1 text-emerald-500" title={text.priceUp}>▲</span> : player.priceChange < 0 ? <span className="mr-1 text-red-500" title={text.priceDown}>▼</span> : null}
            {text.money(formatPrice(player.price, locale))}
          </>, player.ranks.price)}
          {stat(info.form, player.form.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), player.ranks.form)}
          {stat(info.totalPoints, player.points, player.ranks.points)}
        </div>
        <div className="flex shrink-0 border-b border-border" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "fixtures"} onClick={() => setTab("fixtures")} className={tabClass(tab === "fixtures")}>{info.tabs.fixtures}</button>
          <button type="button" role="tab" aria-selected={tab === "results"} onClick={() => setTab("results")} className={tabClass(tab === "results")}>{info.tabs.results}</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {!loaded ? <p className="text-sm text-muted">{info.loading}</p>
            : loaded.failed || !loaded.data ? <p className="text-sm text-red-500">{info.loadError}</p>
            : tab === "fixtures" ? (
              loaded.data.fixtures.length ? (
                <ul className="grid gap-1.5 text-sm">
                  {loaded.data.fixtures.map((fixture) => (
                    <li key={fixture.id} className="flex items-center gap-2">
                      <span className="w-10 shrink-0 text-xs font-semibold text-muted">{fixture.round === null ? "–" : `${info.columns.round[0]} ${fixture.round}`}</span>
                      <Crest src={fixture.opponentCrest} />
                      <span className="min-w-0 truncate font-medium">{info.fixture(fixture.opponent, fixture.home)}</span>
                      {fixture.live
                        ? <span className="ml-auto shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">{info.live}</span>
                        : <span className="ml-auto shrink-0 text-xs text-muted">{time.format(new Date(fixture.kickoffAt))}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">{info.noFixtures}</p>
            ) : (
              <div className="grid gap-5">
                {loaded.data.results.length ? (
                  <div className="-mx-4 overflow-x-auto px-4">
                    <table className="w-full text-xs">
                      <thead className="text-muted">
                        <tr className="border-b border-border">
                          <th className="px-2 py-1.5 text-left font-semibold" title={info.columns.round[1]}>{info.columns.round[0]}</th>
                          <th className="px-2 py-1.5 text-left font-semibold" title={info.columns.opponent[1]}>{info.columns.opponent[0]}</th>
                          {RESULT_COLUMNS.map((column) => <th key={column} className="px-2 py-1.5 text-center font-semibold" title={info.columns[column][1]}>{info.columns[column][0]}</th>)}
                          <th className="px-2 py-1.5 text-center font-semibold" title={info.columns.price[1]}>{info.columns.price[0]}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loaded.data.results.map((result) => (
                          <tr key={result.id} className="border-b border-border/60">
                            <td className="px-2 py-1.5 tabular-nums">{result.round ?? "–"}</td>
                            <td className="whitespace-nowrap px-2 py-1.5">
                              {info.fixture(clubCode(result.opponent), result.home)}
                              {result.goalsFor !== null && result.goalsAgainst !== null ? <span className="ml-1 font-semibold tabular-nums">{result.goalsFor}–{result.goalsAgainst}</span> : null}
                            </td>
                            {RESULT_COLUMNS.map((column) => <td key={column} className={`${cell} ${column === "points" ? "font-bold" : ""}`}>{result[column]}</td>)}
                            <td className={cell}>{result.price === null ? "–" : formatPrice(result.price, locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-muted">{info.noResults}</p>}
                {loaded.data.previousSeason ? (
                  <div className="grid gap-2">
                    <p className="text-sm font-semibold">{info.previousSeasons}</p>
                    <div className="-mx-4 overflow-x-auto px-4">
                      <table className="w-full text-xs">
                        <thead className="text-muted">
                          <tr className="border-b border-border">
                            {(["season", "appearances", "minutes", "goals", "assists"] as const).map((column) => (
                              <th key={column} className={`px-2 py-1.5 font-semibold ${column === "season" ? "text-left" : "text-center"}`} title={info.previousColumns[column][1]}>{info.previousColumns[column][0]}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-2 py-1.5">{loaded.data.previousSeason.label}</td>
                            <td className={cell}>{loaded.data.previousSeason.appearances}</td>
                            <td className={cell}>{loaded.data.previousSeason.minutes}</td>
                            <td className={cell}>{loaded.data.previousSeason.goals}</td>
                            <td className={cell}>{loaded.data.previousSeason.assists}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
        </div>
        {children ? <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border p-4">{children}</div> : null}
      </div>
    </div>
  );
}

// For sider uten lagbygger (Poeng-siden): trykk på et kort åpner spillervinduet, uten knappene
// for bytte og kaptein.
const PlayerInfoContext = createContext<((id: number) => void) | null>(null);

export function FantasyPlayerInfoProvider({ players, children }: { players: FantasyPlayerOption[]; children: ReactNode }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const player = openId === null ? null : players.find((item) => item.id === openId) ?? null;
  return (
    <PlayerInfoContext.Provider value={setOpenId}>
      {children}
      {player ? <PlayerInfoDialog key={player.id} player={player} onClose={() => setOpenId(null)} /> : null}
    </PlayerInfoContext.Provider>
  );
}

export function InfoPlayerCard({ playerId, ...props }: Omit<ComponentProps<typeof FantasyPlayerCard>, "onTap" | "onDragStart" | "dragId"> & { playerId: number }) {
  const open = useContext(PlayerInfoContext);
  return <FantasyPlayerCard {...props} onTap={open ? () => open(playerId) : undefined} />;
}
