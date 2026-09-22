"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/actions";
import { completeManagerMatchAction, makeManagerSubstitutionAction, saveManagerTacticAction } from "@/lib/career-actions";
import { getManagerGoals, getManagerKickoff, getManagerMatchReport, getManagerSubstitutions, scoreAtMinute, teamAfterSubstitutions, type ManagerTactics } from "@/lib/manager-match";
import { buttonClass, cardClass } from "./ui";

const initial: ActionState = {};
const HALF_MS = 60_000;
const HALFTIME_MS = 30_000;
const FULL_TIME_MS = HALF_MS * 2 + HALFTIME_MS;
const tacticLabels: Record<string, string> = { defensive: "Defensiv", balanced: "Balansert", attacking: "Offensiv", low: "Lavt press", normal: "Normalt press", high: "Høyt press", wings: "Vinger", central: "Sentralt", counter: "Kontring" };

function tacticChoices(tactics: ManagerTactics | null, userId: string | undefined) {
  if (!userId) return [];
  return Object.entries(tactics?.[userId] ?? {}).sort(([first], [second]) => Number(first) - Number(second)).map(([minute, tactic]) => `${minute}′ · ${tacticLabels[tactic.mentality ?? "balanced"]} · ${tacticLabels[tactic.press ?? "normal"]} · ${tacticLabels[tactic.focus ?? "central"]}`);
}

export function LiveManagerMatch({ match, userId, returnAfterComplete = true }: { match: { id: string; status: string; started_at: string | null; home_score: number; away_score: number; events: unknown; tactics: ManagerTactics | null }; userId: string; returnAfterComplete?: boolean }) {
  const router = useRouter();
  const finishFormRef = useRef<HTMLFormElement>(null);
  const automaticallyFinished = useRef(false);
  const [now, setNow] = useState(0);
  const [state, finishAction] = useActionState(completeManagerMatchAction, initial);
  const [tacticState, tacticAction, choosing] = useActionState(saveManagerTacticAction, initial);
  const [substitutionState, substitutionAction, substituting] = useActionState(makeManagerSubstitutionAction, initial);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (match.status !== "live") return;
    const refresh = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(refresh);
  }, [match.status, router]);

  const elapsed = match.started_at ? Math.max(0, now - new Date(match.started_at).getTime()) : 0;
  const halftime = elapsed >= HALF_MS && elapsed < HALF_MS + HALFTIME_MS;
  const played = Math.min(HALF_MS * 2, elapsed <= HALF_MS ? elapsed : elapsed - HALFTIME_MS);
  const virtualMinute = Math.min(90, played <= HALF_MS ? Math.floor(played / HALF_MS * 45) : 45 + Math.floor((played - HALF_MS) / HALF_MS * 45));
  const fullTime = elapsed >= FULL_TIME_MS;
  const kickoff = getManagerKickoff(match.events);
  const goals = getManagerGoals(match.events);
  const liveScore = scoreAtMinute(goals, virtualMinute);
  const score = match.status === "completed" ? { home: match.home_score, away: match.away_score } : liveScore;
  const complete = match.status === "completed";
  const visibleGoals = complete ? goals : goals.filter((goal) => goal.minute <= virtualMinute);
  const allSubstitutions = getManagerSubstitutions(match.events);
  const playerNames = new Map(kickoff ? [...kickoff.home.starters, ...kickoff.home.bench, ...kickoff.away.starters, ...kickoff.away.bench].map((player) => [player.id, player.name]) : []);
  const visibleSubstitutions = virtualMinute >= 45 ? allSubstitutions : [];
  const moment = elapsed >= 110_000 && elapsed < FULL_TIME_MS ? "60" : elapsed >= HALF_MS && elapsed < HALF_MS + HALFTIME_MS ? "45" : elapsed >= 40_000 && elapsed < HALF_MS ? "30" : null;
  const alreadyChosen = moment ? Boolean(match.tactics?.[userId]?.[moment]) : true;
  const userSide = kickoff?.home.userId === userId ? "home" : kickoff?.away.userId === userId ? "away" : null;
  const userTeam = userSide ? teamAfterSubstitutions(match.events, userSide) : null;
  const opponentSide = userSide === "home" ? "away" : userSide === "away" ? "home" : null;
  const report = getManagerMatchReport(match.id, match.events, match.tactics);
  const yourReport = report && userSide ? report[userSide] : null;
  const opponentReport = report && opponentSide ? report[opponentSide] : null;
  const yourTactics = tacticChoices(match.tactics, userId);
  const opponentTactics = tacticChoices(match.tactics, userSide === "home" ? kickoff?.away.userId : kickoff?.home.userId);
  const substitutions = userSide ? getManagerSubstitutions(match.events).filter((event) => event.side === userSide) : [];
  const timeLabel = halftime
    ? `PAUSE · ${Math.max(0, Math.ceil((HALF_MS + HALFTIME_MS - elapsed) / 1000))} sek`
    : elapsed < HALF_MS ? `1. omgang · ${Math.max(0, Math.ceil((HALF_MS - elapsed) / 1000))} sek` : `2. omgang · ${Math.max(0, Math.ceil((FULL_TIME_MS - elapsed) / 1000))} sek`;

  useEffect(() => {
    if (match.status !== "live" || !fullTime || automaticallyFinished.current) return;
    automaticallyFinished.current = true;
    finishFormRef.current?.requestSubmit();
  }, [fullTime, match.status]);

  useEffect(() => {
    if (!complete || !returnAfterComplete) return;
    const timer = setTimeout(() => router.replace("/managerkarriere"), 12_000);
    return () => clearTimeout(timer);
  }, [complete, returnAfterComplete, router]);

  return <section className={`${cardClass} grid gap-5 text-center`}>
    <div className="flex items-center justify-between gap-3 text-sm font-bold uppercase tracking-[.2em] text-muted"><span>{complete ? "Slutt" : match.status === "live" ? halftime ? "Pause · 45′" : `Live · ${virtualMinute}′` : "Venter i lobby"}</span>{kickoff ? <span className="rounded-full bg-accent-soft px-3 py-1 text-[10px] text-accent">XI LÅST</span> : null}</div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <div><b className="text-xl">Hjemme</b></div>
      <div className="rounded-xl bg-surface-raised px-6 py-4 text-5xl font-black tabular-nums">{score.home} <span className="text-muted">–</span> {score.away}</div>
      <div><b className="text-xl">Borte</b></div>
    </div>
    {match.status === "live" ? <p className="text-lg font-semibold">{timeLabel}</p> : null}

    {visibleGoals.length || visibleSubstitutions.length ? <div className="grid gap-1 rounded-lg border border-border bg-surface-raised p-3 text-left text-sm">{visibleGoals.map((goal, index) => <p key={`goal-${goal.minute}-${goal.side}-${index}`} className={goal.side === "home" ? "text-success" : "text-accent"}><b>{goal.minute}′</b> Mål · {goal.scorer}</p>)}{visibleSubstitutions.map((substitution, index) => <p key={`sub-${substitution.side}-${substitution.outId}-${index}`} className="text-muted"><b>45′</b> Bytte · {playerNames.get(substitution.outId) ?? "Spiller"} ut, {playerNames.get(substitution.inId) ?? "spiller"} inn</p>)}</div> : <p className="text-sm text-muted">Ingen mål ennå.</p>}

    {complete && report && yourReport && opponentReport ? <section className="grid gap-4 rounded-xl border border-accent bg-accent-soft p-4 text-left"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold tracking-[.2em] text-accent">KAMPUPPSUMMERING</p><h2 className="mt-1 text-xl font-bold">Kampens spiller: {report.playerOfMatch}</h2></div><p className="text-sm text-muted">{returnAfterComplete ? "Tilbake til Manager Karriere om et øyeblikk" : "Lagret i karrierehistorikken"}</p></div><div className="flex justify-between px-1 text-xs font-bold tracking-[.16em] text-muted"><span>DITT LAG</span><span>MOTSTANDER</span></div><div className="grid overflow-hidden rounded-lg border border-border bg-surface-raised text-center sm:grid-cols-4"><div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="text-xs text-muted">LAGSTYRKE</p><p className="mt-1 text-lg font-bold">{yourReport.strength} <span className="text-muted">–</span> {opponentReport.strength}</p></div><div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="text-xs text-muted">BALLBESITTELSE</p><p className="mt-1 text-lg font-bold">{yourReport.possession}% <span className="text-muted">–</span> {opponentReport.possession}%</p></div><div className="border-b border-border p-3 sm:border-b-0 sm:border-r"><p className="text-xs text-muted">SKUDD</p><p className="mt-1 text-lg font-bold">{yourReport.shots} <span className="text-muted">–</span> {opponentReport.shots}</p></div><div className="p-3"><p className="text-xs text-muted">PÅ MÅL</p><p className="mt-1 text-lg font-bold">{yourReport.onTarget} <span className="text-muted">–</span> {opponentReport.onTarget}</p></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-border bg-surface-raised p-3"><p className="text-sm font-semibold">Dine taktiske valg</p>{yourTactics.length ? <ul className="mt-2 grid gap-1 text-xs text-muted">{yourTactics.map((choice) => <li key={choice}>{choice}</li>)}</ul> : <p className="mt-2 text-xs text-muted">Ingen taktiske endringer.</p>}</div><div className="rounded-lg border border-border bg-surface-raised p-3"><p className="text-sm font-semibold">Motstanderens taktiske valg</p>{opponentTactics.length ? <ul className="mt-2 grid gap-1 text-xs text-muted">{opponentTactics.map((choice) => <li key={choice}>{choice}</li>)}</ul> : <p className="mt-2 text-xs text-muted">Ingen taktiske endringer.</p>}</div></div>{!returnAfterComplete ? <Link href="/managerkarriere" className={buttonClass}>Til Manager Karriere</Link> : null}</section> : null}

    {match.status === "live" && moment && !alreadyChosen ? <form action={tacticAction} className="grid gap-2 rounded-lg border border-accent bg-accent-soft p-3 text-left sm:grid-cols-4">
      <input type="hidden" name="match_id" value={match.id} />
      <input type="hidden" name="moment" value={moment} />
      <label className="text-xs">Mentalitet<select className="mt-1 w-full" name="mentality" defaultValue="balanced"><option value="defensive">Defensiv</option><option value="balanced">Balansert</option><option value="attacking">Offensiv</option></select></label>
      <label className="text-xs">Press<select className="mt-1 w-full" name="press" defaultValue="normal"><option value="low">Lavt</option><option value="normal">Normalt</option><option value="high">Høyt</option></select></label>
      <label className="text-xs">Fokus<select className="mt-1 w-full" name="focus" defaultValue="central"><option value="wings">Vinger</option><option value="central">Sentralt</option><option value="counter">Kontring</option></select></label>
      <button className={buttonClass} disabled={choosing}>Sett taktikk</button>
    </form> : null}

    {halftime && userTeam && userTeam.bench.length > 0 ? <form action={substitutionAction} className="grid gap-2 rounded-lg border border-border bg-surface-raised p-3 text-left sm:grid-cols-3">
      <input type="hidden" name="match_id" value={match.id} />
      <label className="text-xs">Ut<select className="mt-1 w-full" name="out_id">{userTeam.starters.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.overall}</option>)}</select></label>
      <label className="text-xs">Inn<select className="mt-1 w-full" name="in_id">{userTeam.bench.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.overall}</option>)}</select></label>
      <button className={buttonClass} disabled={substituting || substitutions.length >= 3}>{substitutions.length >= 3 ? "Tre bytter brukt" : substituting ? "Bytter…" : `Gjør bytte (${substitutions.length}/3)`}</button>
    </form> : null}

    {tacticState.error ?? substitutionState.error ? <p className="text-sm text-danger">{tacticState.error ?? substitutionState.error}</p> : null}
    {match.status === "live" && fullTime ? <p className="text-sm text-muted">Sluttresultatet lagres automatisk på serveren…</p> : null}
    <form ref={finishFormRef} action={finishAction}><input type="hidden" name="match_id" value={match.id} /></form>
    {state.error ? <p className="text-sm text-danger">{state.error}</p> : complete || state.ok ? <p className="text-sm text-success">Resultatet, V/U/T og belønningen er lagret.</p> : null}
  </section>;
}
