"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { chooseFiveShotAction, completeFiveMatchAction, setFiveTacticAction } from "@/lib/femmer/actions";
import { fiveClock, fiveMsPerMinute, fivePlay, fiveScore, fiveShotMinutes, FIVE_HALF_MINUTES, FIVE_MATCH_MINUTES, FIVE_SHOT_CHOICE_MS, FIVE_TACTIC_COOLDOWN, fiveTacticNames, playerOfMatch, type FiveClock, type FiveMatchData, type FiveShotResult, type FiveSide, type FiveTactic, type FiveTacticChange } from "@/lib/femmer/match";
import { buttonClass, cardClass, secondaryButtonClass } from "../ui";
import { FivePitch, sideColors } from "./five-pitch";

const tacticIcons: Record<FiveTactic, string> = { balanced: "⚖️", attack: "⚔️", defend: "🛡️", press: "🔥" };

/** Taktikkbytter for den som spiller: fire knapper, med nedkjøling mellom byttene. */
function TacticPanel({ current, pending, nextFrom, opponent, busy, onPick }: { current: FiveTactic; pending: FiveTacticChange | null; nextFrom: number | null; opponent: FiveTactic; busy: boolean; onPick: (tactic: FiveTactic) => void }) {
  const t = useT().femmer.match;
  const chosen = pending?.tactic ?? current;
  return <section className={`${cardClass} grid gap-2`}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-black">{t.tactics.title}</h3>
      <p className="text-xs text-muted">{t.opponentTactic(`${tacticIcons[opponent]} ${t.tactics[opponent]}`)}</p>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {fiveTacticNames.map((tactic) => {
        const active = tactic === chosen;
        return <button key={tactic} type="button" disabled={busy || active || nextFrom !== null} onClick={() => onPick(tactic)} className={`grid gap-0.5 rounded-xl border px-3 py-2 text-left transition ${active ? "border-lime-300 bg-lime-300/15" : "border-white/15 bg-white/5 enabled:hover:border-lime-300/60 enabled:hover:bg-white/10 disabled:opacity-50"}`}>
          <span className="font-black">{tacticIcons[tactic]} {t.tactics[tactic]}</span>
          <span className="text-[11px] leading-tight text-muted">{t.tacticHelp[tactic]}</span>
        </button>;
      })}
    </div>
    {pending || nextFrom !== null ? <p className="text-xs font-bold text-amber-300">{pending ? t.tacticFrom(pending.minute) : t.tacticNext(nextFrom!)}</p> : null}
  </section>;
}

/** Målene til et lag så langt, med minutt. */
function Scorers({ goals, side }: { goals: { minute: number; side: FiveSide; name: string }[]; side: FiveSide }) {
  const mine = goals.filter((goal) => goal.side === side);
  return <ul className={`grid gap-0.5 text-xs text-white/75 ${side === "home" ? "text-right" : "text-left"}`}>{mine.map((goal, index) => <li key={index} className="truncate">⚽ {goal.name} <span className="tabular-nums text-white/50">{goal.minute}′</span></li>)}</ul>;
}

type Props = { matchId: string; match: FiveMatchData; initialShots: FiveShotResult[]; initialTactics: FiveTacticChange[]; status: "live" | "completed"; startedAt: string | null; serverNow: number; isController: boolean; viewerSide: "home" | "away" | null; coins: number; returnPath: string; season: boolean };

/** Som i managerkarrieren: etter en kamp som nettopp ble spilt, går man tilbake av seg selv etter litt. */
const RETURN_AFTER_MS = 3_000;
const finished: FiveClock = { phase: "full_time", minute: FIVE_MATCH_MINUTES, progress: 0, shotMinute: null, shotElapsedMs: 0 };

/** Tiden på banen i kampminutter: minuttet som spilles nå og hvor langt det har kommet. */
function pitchTime(clock: FiveClock) {
  if (clock.phase === "first_half" || clock.phase === "second_half") return clock.minute + clock.progress;
  return clock.phase === "halftime" ? FIVE_HALF_MINUTES : clock.minute;
}

/**
 * Kampen spilles med klokke fra serveren, så den kan ikke hoppes over og fortsetter der den var hvis
 * man laster siden på nytt. Den vises på en bane der spillerne og ballen spiller ut hendelsene. Den som
 * spiller, bytter taktikk underveis; på straffer og store sjanser zoomer banen inn og man velger rute.
 */
export function FiveMatch({ matchId, match: planned, initialShots, initialTactics, status, startedAt, serverNow, isController, viewerSide, coins, returnPath, season }: Props) {
  const t = useT().femmer;
  const router = useRouter();
  const [offset] = useState(() => serverNow - Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState<FiveShotResult[]>(initialShots);
  const [tactics, setTactics] = useState<FiveTacticChange[]>(initialTactics);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Satt når kampen ble ferdig mens man så på den: myntene man fikk, fra serveren.
  const [settled, setSettled] = useState<{ coins: number } | null>(null);
  const requested = useRef(new Set<string>());
  const live = status === "live" && startedAt !== null;
  const shotMinutes = fiveShotMinutes(planned);
  const msPerMinute = fiveMsPerMinute(planned);
  const known = live ? results : initialShots;
  // Kampen spilles på nytt med taktikkene og stoppene vi kjenner, så banen viser det som faktisk skjer.
  const { match, timeline } = useMemo(() => fivePlay(planned, tactics, known), [planned, tactics, known]);

  useEffect(() => {
    if (!live) return;
    let frame = 0;
    const tick = () => { setElapsed(Date.now() + offset - new Date(startedAt).getTime()); frame = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [live, offset, startedAt]);

  const clock = live ? fiveClock(elapsed, shotMinutes, msPerMinute) : finished;
  const activeShot = clock.shotMinute !== null ? (match.shots ?? []).find((shot) => shot.minute === clock.shotMinute) : undefined;
  const activeResult = activeShot ? results.find((result) => result.minute === activeShot.minute && result.outcome) : undefined;

  const send = (minute: number, cell: number | null) => {
    const key = `${minute}`;
    if (requested.current.has(key)) return;
    requested.current.add(key);
    chooseFiveShotAction(matchId, minute, cell).then((response) => {
      if (response.result) setResults((current) => [...current.filter((entry) => entry.minute !== minute), response.result!]);
      else if (response.error) setError(response.error);
    }).catch(() => requested.current.delete(key));
  };

  const pickTactic = (tactic: FiveTactic) => {
    setBusy(true); setError(null);
    setFiveTacticAction(matchId, tactic).then((response) => {
      if (response.tactics) setTactics(response.tactics);
      else if (response.error) setError(response.error);
    }).catch(() => setError(t.errors.matchNotLive)).finally(() => setBusy(false));
  };

  // Tiden for å velge er ute: da velges det for en. Klokka på serveren avgjør om valget kom i tide.
  useEffect(() => {
    if (!live || !isController || !activeShot || activeResult || clock.shotElapsedMs < FIVE_SHOT_CHOICE_MS) return;
    send(activeShot.minute, null);
  });

  // Ferdig på klokka: kampen gjøres opp på serveren, og sluttresultatet vises med premien.
  useEffect(() => {
    if (!live || clock.phase !== "full_time" || requested.current.has("complete")) return;
    requested.current.add("complete");
    const attempt = (tries: number) => completeFiveMatchAction(matchId).then((response) => {
      if (response.ok) {
        if (response.shots) setResults(response.shots);
        setSettled({ coins: response.coins ?? 0 });
      } else if (tries < 10) setTimeout(() => attempt(tries + 1), 1_500);
      else setError(response.error ?? null);
    });
    attempt(0);
  });

  // Så går man tilbake av seg selv, til sesongen for sesongkamper og ellers til Femmer.
  useEffect(() => {
    if (!settled) return;
    const timer = setTimeout(() => router.replace(returnPath), RETURN_AFTER_MS);
    return () => clearTimeout(timer);
  }, [settled, router, returnPath]);

  const score = fiveScore(match, known, clock.minute);
  const done = !live || settled !== null;
  const shownCoins = settled ? settled.coins : coins;
  const mine = viewerSide ? score[viewerSide] : score.home;
  const theirs = viewerSide ? score[viewerSide === "home" ? "away" : "home"] : score.away;
  const outcome = mine > theirs ? "win" : mine === theirs ? "draw" : "loss";
  const best = done ? playerOfMatch(match, known) : null;

  const goals = [
    ...match.events.filter((event) => event.type === "goal" && event.minute <= clock.minute).map((event) => ({ minute: event.minute, side: event.side, name: event.player })),
    ...(match.shots ?? []).filter((shot) => shot.minute <= clock.minute && known.some((result) => result.minute === shot.minute && result.outcome === "goal")).map((shot) => ({ minute: shot.minute, side: shot.side, name: `${shot.taker}${shot.kind === "penalty" ? ` (${t.match.penaltyShort})` : ""}` })),
  ].sort((first, second) => first.minute - second.minute);

  const secondsLeft = Math.max(0, Math.ceil((FIVE_SHOT_CHOICE_MS - clock.shotElapsedMs) / 1000));

  // Taktikk: hva hvert lag spiller med nå, og når den som spiller kan bytte igjen.
  const controller: FiveSide = match.controllerSide ?? "home";
  const nowMinute = Math.min(FIVE_MATCH_MINUTES, clock.minute + 1);
  const playing = clock.phase === "first_half" || clock.phase === "second_half";
  const from = clock.minute + (playing ? 2 : 1);
  const myChanges = tactics.filter((change) => change.side === controller).sort((first, second) => first.minute - second.minute);
  const last = myChanges.at(-1) ?? null;
  const pending = last && last.minute > nowMinute ? last : null;
  const nextFrom = last && from < last.minute + FIVE_TACTIC_COOLDOWN ? last.minute + FIVE_TACTIC_COOLDOWN : null;
  const showTactics = live && !done && match.version === 3 && clock.phase !== "full_time" && from <= FIVE_MATCH_MINUTES;
  const current = timeline[nowMinute] ?? { home: "balanced", away: "balanced" };

  return <div className="grid gap-4">
    <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-fuchsia-500/25 via-slate-950 to-amber-500/20 p-4 text-center sm:p-5">
      <p className="text-sm font-black tracking-widest text-white/60">{done ? t.match.fullTime : clock.phase === "halftime" ? t.match.halfTime : clock.phase === "full_time" ? t.match.settling : clock.minute === 0 && clock.progress < 0.2 ? t.match.kickoff : `${Math.min(FIVE_MATCH_MINUTES, clock.minute + (playing ? 1 : 0))}′`}</p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className={`truncate text-right text-lg font-black sm:text-2xl ${sideColors.home.text}`}>{match.home.name}</p>
        <p className="text-5xl font-black tabular-nums">{score.home}–{score.away}</p>
        <p className={`truncate text-left text-lg font-black sm:text-2xl ${sideColors.away.text}`}>{match.away.name}</p>
      </div>
      <div className="mx-auto mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-white/15"><div className="h-full bg-lime-300" style={{ width: `${(Math.min(FIVE_MATCH_MINUTES, clock.minute + (playing ? clock.progress : 0)) / FIVE_MATCH_MINUTES) * 100}%` }} /></div>
      {goals.length ? <div className="mt-2 grid grid-cols-[1fr_auto_1fr] gap-3"><Scorers goals={goals} side="home" /><span className="w-[5.5rem]" /><Scorers goals={goals} side="away" /></div> : null}
      {match.version === 3 && !done ? <div className="mt-2 flex justify-between gap-2 text-[11px] font-black">
        <span className={`rounded-full px-2 py-0.5 ${sideColors.home.chip}`}>{tacticIcons[current.home]} {t.match.tactics[current.home]}</span>
        <span className={`rounded-full px-2 py-0.5 ${sideColors.away.chip}`}>{tacticIcons[current.away]} {t.match.tactics[current.away]}</span>
      </div> : null}
      {done ? <div className="mt-4 grid gap-1">
        {viewerSide ? <p className={`text-2xl font-black ${outcome === "win" ? "text-lime-300" : outcome === "loss" ? "text-red-300" : ""}`}>{t.match[outcome]}</p> : null}
        {best ? <p className="text-sm text-white/70">{t.match.playerOfMatch}: <b>{best}</b></p> : null}
        {shownCoins > 0 ? <p className="text-sm font-bold text-amber-300">{t.match.reward(shownCoins)}</p> : null}
        {settled ? <p className="mt-2 text-sm text-white/60">{season ? t.match.returningSeason : t.match.returning}</p> : null}
      </div> : null}
    </section>

    <FivePitch match={match} results={known} time={live ? pitchTime(clock) : FIVE_MATCH_MINUTES} shot={live ? activeShot : undefined} shotResult={activeResult} shotInteractive={isController && !activeResult && clock.shotElapsedMs < FIVE_SHOT_CHOICE_MS} secondsLeft={secondsLeft} isController={isController} onPick={(cell) => activeShot && send(activeShot.minute, cell)} />
    {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}

    {showTactics && isController ? <TacticPanel current={current[controller]} pending={pending} nextFrom={nextFrom} opponent={current[controller === "home" ? "away" : "home"]} busy={busy} onPick={pickTactic} /> : null}

    {done ? <div className="flex flex-wrap justify-center gap-2"><Link href={returnPath} replace={Boolean(settled)} className={buttonClass}>{season ? t.match.backSeason : t.match.back}</Link>{season ? null : <Link href="/femmer?tab=kamp" className={secondaryButtonClass}>{t.match.playAgain}</Link>}</div> : null}
  </div>;
}
