"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/actions";
import { STAT_GROUPS, STAT_LABELS, type StatKey } from "@/lib/career-stats";
import { choosePlayerCareerStatAction, forfeitPlayerCareerRoundAction } from "@/lib/career-actions";
import { buttonClass, cardClass } from "./ui";

type Round = {
  leader: string;
  category?: string;
  startedAt: string;
  homeStat?: StatKey;
  awayStat?: StatKey;
  homeValue?: number;
  awayValue?: number;
  winnerId?: string | null;
};

const initial: ActionState = {};

export function PlayerCareerMatch({ match, userId }: { match: { id: string; status: string; home_user_id: string; away_user_id: string; home_score: number; away_score: number; events: Round[] | null }; userId: string }) {
  const router = useRouter();
  const [now, setNow] = useState(0);
  const [state, action, pending] = useActionState(choosePlayerCareerStatAction, initial);
  const [forfeitState, forfeitAction, forfeiting] = useActionState(forfeitPlayerCareerRoundAction, initial);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (match.status !== "live") return;
    const refresh = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(refresh);
  }, [match.status, router]);

  const rounds = match.events ?? [];
  const current = rounds.at(-1);
  const partial = current && current.winnerId === undefined ? current : null;
  const resolvedRounds = rounds.filter((round) => round.winnerId !== undefined);
  const completed = match.status === "completed";
  const leaderTurn = Boolean(partial && (partial.category ? partial.leader !== userId : partial.leader === userId));
  const used = new Set(rounds.flatMap((round) => [round.homeStat, round.awayStat]).filter((stat): stat is StatKey => Boolean(stat)));
  const seconds = partial ? Math.max(0, 30 - Math.floor((now - new Date(partial.startedAt).getTime()) / 1000)) : 0;
  const permitted = Object.entries(STAT_GROUPS).flatMap(([group, stats]) => (stats as readonly StatKey[])
    .filter((stat) => !used.has(stat) && (!partial?.category || group === partial.category))
    .map((stat) => ({ stat, group })));
  const homePoints = resolvedRounds.filter((round) => round.winnerId === match.home_user_id).length;
  const awayPoints = resolvedRounds.filter((round) => round.winnerId === match.away_user_id).length;
  const roundLabel = `Runde ${Math.min(10, resolvedRounds.length + 1)} av 10`;
  const pickedStat = partial?.homeStat ?? partial?.awayStat;

  return <section className={`${cardClass} grid gap-5`}>
    <div className="text-center">
      <p className="text-sm font-bold uppercase tracking-[.25em] text-muted">{completed ? "Sluttresultat" : roundLabel}</p>
      <div className="mt-2 text-4xl font-black">{homePoints} <span className="text-muted">–</span> {awayPoints}</div>
    </div>

    {!completed && partial ? <div className="rounded-xl border border-accent bg-accent-soft p-4">
      <p className="font-semibold">{!partial.category
        ? partial.leader === userId ? "Din tur: velg kategori og understat" : "Motstanderen velger kategori først"
        : partial.leader === userId ? `${STAT_LABELS[pickedStat as StatKey]} er valgt – vent på motstanderen` : `Velg en annen understat innen ${partial.category}`}</p>
      <p className="mt-1 text-sm text-muted">{seconds > 0 ? `${seconds} sekunder igjen` : "Tiden er ute"}</p>

      {leaderTurn && seconds > 0 ? <form action={action} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="match_id" value={match.id} />
        {permitted.map(({ stat, group }) => <button key={stat} className="rounded-lg border border-border bg-surface-raised p-3 text-left hover:border-accent disabled:opacity-50" name="stat" value={stat} disabled={pending}>
          <span className="text-xs text-muted">{group}</span><b className="ml-2">{STAT_LABELS[stat]}</b>
        </button>)}
      </form> : null}

      {seconds <= 0 ? <form action={forfeitAction} className="mt-3">
        <input type="hidden" name="match_id" value={match.id} />
        <button className={buttonClass} disabled={forfeiting}>{forfeiting ? "Registrerer…" : "Registrer rundetap"}</button>
      </form> : null}
    </div> : null}

    {completed ? <p className="text-center text-lg font-semibold text-success">Kampen er ferdig. Seier gir 5 spillerpoeng, og uavgjort gir 2 til hver.</p> : null}

    {resolvedRounds.length ? <div className="grid gap-2">
      <h2 className="text-sm font-bold uppercase text-muted">Ferdige runder</h2>
      {resolvedRounds.map((round, index) => <div key={`${round.startedAt}-${index}`} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
        <span>#{index + 1} · {round.category ?? "Utløpt"}</span>
        <span>{round.homeStat ? `${STAT_LABELS[round.homeStat]} ${round.homeValue ?? ""}` : "–"} <b className="mx-2">vs</b> {round.awayStat ? `${STAT_LABELS[round.awayStat]} ${round.awayValue ?? ""}` : "–"}</span>
      </div>)}
    </div> : null}
    {state.error ?? forfeitState.error ? <p className="text-sm text-danger">{state.error ?? forfeitState.error}</p> : null}
  </section>;
}
