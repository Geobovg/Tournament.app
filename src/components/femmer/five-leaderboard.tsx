import type { ReactNode } from "react";
import { getT } from "@/i18n/server";
import type { FiveLeaderboard as Leaderboard } from "@/lib/femmer/data";
import { cardClass } from "../ui";

function Table({ title, rows }: { title: string; rows: { key: string; name: ReactNode; value: ReactNode; me: boolean }[] }) {
  return <section className={`${cardClass} grid content-start gap-2`}>
    <h3 className="font-black">{title}</h3>
    {rows.length ? <ol className="grid gap-1">{rows.map((row, index) => <li key={row.key} className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm ${row.me ? "bg-lime-300/15 font-black" : "bg-white/5"}`}>
      <span className={`w-6 text-right font-black tabular-nums ${index < 3 ? "text-amber-300" : "text-white/50"}`}>{index + 1}</span>
      <span className="min-w-0 flex-1 truncate">{row.name}</span><span className="font-black tabular-nums">{row.value}</span>
    </li>)}</ol> : <p className="text-sm text-muted">—</p>}
  </section>;
}

/** Topplistene i Femmer, for alle som spiller modusen. */
export async function FiveLeaderboard({ board, userId }: { board: Leaderboard; userId: string }) {
  const t = (await getT()).femmer;
  return <div className="grid gap-4 md:grid-cols-2">
    <Table title={t.leaderboard.ladder} rows={board.ladder.map((row) => ({ key: row.userId, name: row.username, value: t.leaderboard.step(row.best), me: row.userId === userId }))} />
    <Table title={t.leaderboard.rating} rows={board.ratings.map((row) => ({ key: row.userId, name: row.username, value: row.rating, me: row.userId === userId }))} />
    <Table title={t.leaderboard.scorers} rows={board.scorers.map((row) => ({ key: row.cardId, name: <>{row.name}{row.inform ? <span className="ml-1 text-amber-300">★</span> : null} <span className="text-xs text-muted">({row.owner})</span></>, value: t.leaderboard.goals(row.goals), me: false }))} />
    <Table title={t.leaderboard.results} rows={board.records.map((row) => ({ key: row.userId, name: row.username, value: t.recordValue(row.wins, row.draws, row.losses), me: row.userId === userId }))} />
  </div>;
}
