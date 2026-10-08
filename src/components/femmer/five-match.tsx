"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { chooseFiveShotAction, completeFiveMatchAction } from "@/lib/femmer/actions";
import { controllerShoots, effectiveRatings, fiveCellChance, fiveClock, fiveScore, fiveShotMinutes, FIVE_MATCH_MINUTES, FIVE_SHOT_CELLS, FIVE_SHOT_CHOICE_MS, playerOfMatch, teamRating, type FiveMatchData, type FiveShot, type FiveShotResult, type FiveTeam } from "@/lib/femmer/match";
import { buttonClass, cardClass, secondaryButtonClass } from "../ui";
import { FiveCardTile } from "./five-card";

function Lineup({ team, title }: { team: FiveTeam; title: string }) {
  const t = useT().femmer;
  const ratings = effectiveRatings(team);
  return <section className={`${cardClass} grid gap-2`}>
    <h3 className="font-black">{title} <span className="text-sm text-muted">· {team.formation} · {t.teamRating} {teamRating(team.starters) ?? "—"}</span></h3>
    <div className="flex flex-wrap gap-2">{team.starters.map((player) => { const rating = ratings.get(player.id) ?? player.overall; return <FiveCardTile key={player.id} name={player.name} slug={player.slug} overall={player.overall} position={player.position} inform={player.inform} size="sm" label={rating < player.overall ? `${rating}` : undefined} warn={rating < player.overall} />; })}</div>
    {team.bench.length ? <><p className="text-xs font-bold text-muted">{t.match.bench}</p><div className="flex flex-wrap gap-1 opacity-80">{team.bench.map((player) => <FiveCardTile key={player.id} name={player.name} slug={player.slug} overall={player.overall} position={player.position} inform={player.inform} size="sm" />)}</div></> : null}
  </section>;
}

/** Målet delt i 3 × 2 ruter. Som skytter står sjansen på hver rute; som keeper velger man hvor man kaster seg. */
function ShotGoal({ match, shot, result, interactive, onPick }: { match: FiveMatchData; shot: FiveShot; result: FiveShotResult | undefined; interactive: boolean; onPick: (cell: number) => void }) {
  const shooting = controllerShoots(match, shot);
  return <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-1.5 rounded-t-xl border-4 border-b-0 border-white bg-[repeating-linear-gradient(45deg,rgba(255,255,255,.07)_0_6px,transparent_6px_12px)] p-2">
    {Array.from({ length: FIVE_SHOT_CELLS }, (_, cell) => {
      const ball = result?.shooterCell === cell; const glove = result?.keeperCell === cell;
      return <button key={cell} type="button" disabled={!interactive} onClick={() => onPick(cell)} className={`grid h-16 place-items-center rounded-lg border text-lg font-black transition sm:h-20 ${interactive ? "border-lime-300/60 bg-lime-300/10 hover:bg-lime-300/30" : "border-white/15 bg-black/20"}`}>
        {result ? <span className="text-3xl">{ball && glove ? "🧤⚽" : ball ? "⚽" : glove ? "🧤" : ""}</span> : shooting ? `${Math.round(fiveCellChance(shot, cell) * 100)}%` : "🧤"}
      </button>;
    })}
  </div>;
}

type Props = { matchId: string; match: FiveMatchData; initialShots: FiveShotResult[]; status: "live" | "completed"; startedAt: string | null; serverNow: number; isController: boolean; viewerSide: "home" | "away" | null; coins: number };

/**
 * Kampen spilles med klokke fra serveren, så den kan ikke hoppes over og fortsetter der den var hvis
 * man laster siden på nytt. På straffer og store sjanser stopper klokka og den som spiller velger.
 */
export function FiveMatch({ matchId, match, initialShots, status, startedAt, serverNow, isController, viewerSide, coins }: Props) {
  const t = useT().femmer;
  const router = useRouter();
  const [offset] = useState(() => serverNow - Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState<FiveShotResult[]>(initialShots);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(new Set<string>());
  const live = status === "live" && startedAt !== null;
  const shotMinutes = fiveShotMinutes(match);

  useEffect(() => {
    if (!live) return;
    const tick = () => setElapsed(Date.now() + offset - new Date(startedAt).getTime());
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [live, offset, startedAt]);

  const clock = live ? fiveClock(elapsed, shotMinutes) : { phase: "full_time" as const, minute: FIVE_MATCH_MINUTES, shotMinute: null, shotElapsedMs: 0 };
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

  // Tiden for å velge er ute: da velges det for en. Klokka på serveren avgjør om valget kom i tide.
  useEffect(() => {
    if (!live || !isController || !activeShot || activeResult || clock.shotElapsedMs < FIVE_SHOT_CHOICE_MS) return;
    send(activeShot.minute, null);
  });

  // Ferdig på klokka: kampen gjøres opp på serveren, så hentes siden på nytt med resultat og premie.
  useEffect(() => {
    if (!live || clock.phase !== "full_time" || requested.current.has("complete")) return;
    requested.current.add("complete");
    const attempt = (tries: number) => completeFiveMatchAction(matchId).then((response) => {
      if (response.ok) router.refresh();
      else if (tries < 10) setTimeout(() => attempt(tries + 1), 1_500);
      else setError(response.error ?? null);
    });
    attempt(0);
  });

  const known = live ? results : initialShots;
  const score = fiveScore(match, known, clock.minute);
  const done = !live;
  const mine = viewerSide ? score[viewerSide] : score.home;
  const theirs = viewerSide ? score[viewerSide === "home" ? "away" : "home"] : score.away;
  const outcome = mine > theirs ? "win" : mine === theirs ? "draw" : "loss";
  const best = done ? playerOfMatch(match, known) : null;

  // Hendelsene så langt: åpent spill og avgjorte stopp, nyeste øverst.
  const feed = [
    ...match.events.filter((event) => event.minute <= clock.minute).map((event) => ({ minute: event.minute, side: event.side, goal: event.type === "goal", text: event.type === "goal" ? `⚽ ${t.match.goal} – ${event.player}${event.assist ? ` (${t.match.assist(event.assist)})` : ""}` : event.type === "save" ? `🧤 ${event.player} – ${t.match.saved(event.keeper)}` : `▮ ${event.player} – ${t.match.post}` })),
    ...(match.shots ?? []).filter((shot) => shot.minute <= clock.minute).flatMap((shot) => {
      const result = known.find((entry) => entry.minute === shot.minute);
      if (!result?.outcome) return [];
      const label = shot.kind === "penalty" ? t.match.penalty : t.match.bigChance;
      return [{ minute: shot.minute, side: shot.side, goal: result.outcome === "goal", text: `${result.outcome === "goal" ? "⚽" : result.outcome === "saved" ? "🧤" : "✕"} ${label} – ${shot.taker}: ${t.match.shotOutcome[result.outcome]}` }];
    }),
  ].sort((first, second) => second.minute - first.minute);

  const shooting = activeShot ? controllerShoots(match, activeShot) : false;
  const secondsLeft = Math.max(0, Math.ceil((FIVE_SHOT_CHOICE_MS - clock.shotElapsedMs) / 1000));

  return <div className="grid gap-4">
    <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-fuchsia-500/25 via-slate-950 to-amber-500/20 p-5 text-center">
      <p className="text-sm font-black tracking-widest text-white/60">{done ? t.match.fullTime : clock.phase === "halftime" ? t.match.halfTime : clock.phase === "full_time" ? t.match.settling : clock.minute === 0 ? t.match.kickoff : `${clock.minute}′`}</p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="truncate text-right text-lg font-black sm:text-2xl">{match.home.name}</p>
        <p className="text-5xl font-black tabular-nums">{score.home}–{score.away}</p>
        <p className="truncate text-left text-lg font-black sm:text-2xl">{match.away.name}</p>
      </div>
      <div className="mx-auto mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-white/15"><div className="h-full bg-lime-300 transition-all" style={{ width: `${(clock.minute / FIVE_MATCH_MINUTES) * 100}%` }} /></div>
      {done ? <div className="mt-4 grid gap-1">
        {viewerSide ? <p className={`text-2xl font-black ${outcome === "win" ? "text-lime-300" : outcome === "loss" ? "text-red-300" : ""}`}>{t.match[outcome]}</p> : null}
        {best ? <p className="text-sm text-white/70">{t.match.playerOfMatch}: <b>{best}</b></p> : null}
        {coins > 0 ? <p className="text-sm font-bold text-amber-300">{t.match.reward(coins)}</p> : null}
      </div> : null}
    </section>

    {activeShot && live ? <section className={`${cardClass} grid gap-3 text-center`}>
      <p className="text-xs font-black tracking-widest text-amber-300">{activeShot.kind === "penalty" ? t.match.penalty : t.match.bigChance} · {activeShot.minute}′</p>
      <h3 className="text-xl font-black">{isController ? (shooting ? t.match.youShoot(activeShot.taker, activeShot.keeper ?? "?") : t.match.youSave(activeShot.keeper ?? "?", activeShot.taker)) : t.match.watching(activeShot.taker)}</h3>
      {!activeResult && isController ? <p className="text-sm text-muted">{shooting ? t.match.pickCorner : t.match.pickDive} · {secondsLeft}s</p> : null}
      <ShotGoal match={match} shot={activeShot} result={activeResult} interactive={isController && !activeResult && clock.shotElapsedMs < FIVE_SHOT_CHOICE_MS} onPick={(cell) => send(activeShot.minute, cell)} />
      {activeResult?.outcome ? <p className={`text-2xl font-black ${activeResult.outcome === "goal" ? "text-lime-300" : "text-red-300"}`}>{t.match.shotOutcome[activeResult.outcome]}</p> : null}
    </section> : null}
    {error ? <p className="text-red-400">{error}</p> : null}

    <section className={`${cardClass} grid gap-2`}>
      {feed.length === 0 ? <p className="text-sm text-muted">{t.match.kickoff}…</p> : null}
      <ul className="grid gap-1.5">{feed.map((entry, index) => <li key={`${entry.minute}-${entry.side}-${index}`} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${entry.goal ? "bg-lime-400/15 font-black" : "bg-white/5"} ${entry.side === "home" ? "" : "flex-row-reverse text-right"}`}>
        <span className="w-8 shrink-0 font-black tabular-nums text-white/60">{entry.minute}′</span><span className="min-w-0 flex-1">{entry.text}</span>
      </li>)}</ul>
    </section>

    <div className="grid gap-4 lg:grid-cols-2"><Lineup team={match.home} title={match.home.name} /><Lineup team={match.away} title={match.away.name} /></div>
    {done ? <div className="flex flex-wrap gap-2"><Link href="/femmer?tab=kamp" className={buttonClass}>{t.match.playAgain}</Link><Link href="/femmer" className={secondaryButtonClass}>{t.match.back}</Link></div> : null}
  </div>;
}
