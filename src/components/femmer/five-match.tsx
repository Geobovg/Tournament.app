"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { FIVE_HALF_MINUTES, FIVE_MATCH_MINUTES, teamRating, type FiveMatchData, type FiveTeam } from "@/lib/femmer/match";
import { buttonClass, cardClass, secondaryButtonClass } from "../ui";
import { FiveCardTile } from "./five-card";

const MS_PER_MINUTE = 450;
const HALFTIME_MS = 2_000;
const TOTAL_MS = FIVE_MATCH_MINUTES * MS_PER_MINUTE + HALFTIME_MS;

/** Kampminuttet etter `elapsed` millisekunder, med en kort pause etter første omgang. */
function minuteAt(elapsed: number) {
  const firstHalf = FIVE_HALF_MINUTES * MS_PER_MINUTE;
  if (elapsed < firstHalf) return { minute: Math.floor(elapsed / MS_PER_MINUTE), halftime: false };
  if (elapsed < firstHalf + HALFTIME_MS) return { minute: FIVE_HALF_MINUTES, halftime: true };
  return { minute: Math.min(FIVE_MATCH_MINUTES, FIVE_HALF_MINUTES + Math.floor((elapsed - firstHalf - HALFTIME_MS) / MS_PER_MINUTE)), halftime: false };
}

function Lineup({ team, title }: { team: FiveTeam; title: string }) {
  const t = useT().femmer;
  return <section className={`${cardClass} grid gap-2`}>
    <h3 className="font-black">{title} <span className="text-sm text-muted">· {team.formation} · {t.teamRating} {teamRating(team.starters) ?? "—"}</span></h3>
    <div className="flex flex-wrap gap-2">{team.starters.map((player) => <FiveCardTile key={player.id} name={player.name} slug={player.slug} overall={player.overall} size="sm" />)}</div>
    {team.bench.length ? <><p className="text-xs font-bold text-muted">{t.match.bench}</p><div className="flex flex-wrap gap-1 opacity-80">{team.bench.map((player) => <FiveCardTile key={player.id} name={player.name} slug={player.slug} overall={player.overall} size="sm" />)}</div></> : null}
  </section>;
}

/** Spiller av en ferdig simulert kamp. Første gang går klokka; i historikken vises sluttresultatet med en gang. */
export function FiveMatch({ match, coins, viewerIsHome, replay }: { match: FiveMatchData; coins: number; viewerIsHome: boolean; replay: boolean }) {
  const t = useT().femmer;
  const [elapsed, setElapsed] = useState(replay ? 0 : TOTAL_MS);
  useEffect(() => {
    if (!replay) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const next = Date.now() - started;
      setElapsed(next);
      if (next >= TOTAL_MS) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [replay]);

  const done = elapsed >= TOTAL_MS;
  const { minute, halftime } = done ? { minute: FIVE_MATCH_MINUTES, halftime: false } : minuteAt(elapsed);
  const shown = match.events.filter((event) => event.minute <= minute);
  const score = { home: shown.filter((event) => event.type === "goal" && event.side === "home").length, away: shown.filter((event) => event.type === "goal" && event.side === "away").length };
  const mine = viewerIsHome ? score.home : score.away;
  const theirs = viewerIsHome ? score.away : score.home;
  const result = mine > theirs ? "win" : mine === theirs ? "draw" : "loss";

  return <div className="grid gap-4">
    <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-fuchsia-500/25 via-slate-950 to-amber-500/20 p-5 text-center">
      <p className="text-sm font-black tracking-widest text-white/60">{done ? t.match.fullTime : halftime ? t.match.halfTime : minute === 0 ? t.match.kickoff : `${minute}′`}</p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="truncate text-right text-lg font-black sm:text-2xl">{match.home.name}</p>
        <p className="text-5xl font-black tabular-nums">{score.home}–{score.away}</p>
        <p className="truncate text-left text-lg font-black sm:text-2xl">{match.away.name}</p>
      </div>
      <div className="mx-auto mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-white/15"><div className="h-full bg-lime-300 transition-all" style={{ width: `${(minute / FIVE_MATCH_MINUTES) * 100}%` }} /></div>
      {done ? <div className="mt-4 grid gap-1">
        <p className={`text-2xl font-black ${result === "win" ? "text-lime-300" : result === "loss" ? "text-red-300" : ""}`}>{t.match[result]}</p>
        {match.playerOfMatch ? <p className="text-sm text-white/70">{t.match.playerOfMatch}: <b>{match.playerOfMatch}</b></p> : null}
        {viewerIsHome ? <p className="text-sm font-bold text-amber-300">{coins > 0 ? t.match.reward(coins) : t.match.noReward}</p> : null}
        {viewerIsHome ? <p className="text-xs text-white/60">{t.match.xpNote}</p> : null}
      </div> : <button type="button" onClick={() => setElapsed(TOTAL_MS)} className={`${secondaryButtonClass} mt-4`}>{t.match.skip}</button>}
    </section>

    <section className={`${cardClass} grid gap-2`}>
      {shown.length === 0 ? <p className="text-sm text-muted">{t.match.kickoff}…</p> : null}
      <ul className="grid gap-1.5">{[...shown].reverse().map((event, index) => {
        const left = event.side === "home";
        const text = event.type === "goal" ? `⚽ ${t.match.goal} – ${event.player}${event.assist ? ` (${t.match.assist(event.assist)})` : ""}` : event.type === "save" ? `🧤 ${event.player} – ${t.match.saved(event.keeper)}` : `▮ ${event.player} – ${t.match.post}`;
        return <li key={`${event.minute}-${event.side}-${index}`} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${event.type === "goal" ? "bg-lime-400/15 font-black" : "bg-white/5"} ${left ? "" : "flex-row-reverse text-right"}`}>
          <span className="w-8 shrink-0 font-black tabular-nums text-white/60">{event.minute}′</span><span className="min-w-0 flex-1">{text}</span>
        </li>;
      })}</ul>
    </section>

    <div className="grid gap-4 lg:grid-cols-2"><Lineup team={match.home} title={match.home.name} /><Lineup team={match.away} title={match.away.name} /></div>
    {done ? <div className="flex flex-wrap gap-2"><Link href="/femmer?tab=kamp" className={buttonClass}>{t.match.playAgain}</Link><Link href="/femmer" className={secondaryButtonClass}>{t.match.back}</Link></div> : null}
  </div>;
}
