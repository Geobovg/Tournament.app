import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { StandingRow } from "@/lib/fantasy/data";

// Tabell over fantasy-lag. Trykk på et lag for å se poengene i siste runde.
export function FantasyStandings({ rows, userId, t, limit }: { rows: StandingRow[]; userId: string; t: Dictionary; limit?: number }) {
  const text = t.fantasy.leagues;
  if (!rows.length) return <p className="text-sm text-muted">{text.noTeams}</p>;
  const shown = limit ? rows.slice(0, limit) : rows;
  const mine = rows.find((row) => row.userId === userId);
  return (
    <div className="grid gap-2">
      {mine ? <p className="text-sm text-muted">{text.yourRank(mine.rank, rows.length)}</p> : null}
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted"><th className="w-10 py-1">{text.rank}</th><th className="py-1">{text.team}</th><th className="w-16 py-1 text-right">{text.round}</th><th className="w-16 py-1 text-right">{text.total}</th></tr></thead>
        <tbody>
          {shown.map((row) => (
            <tr key={row.teamId} className={`border-t border-border ${row.userId === userId ? "font-semibold" : ""}`}>
              <td className="py-2 tabular-nums">{row.rank}</td>
              <td className="py-2"><Link href={`/fantasy/points?team=${row.teamId}`} className="hover:underline">{row.teamName}</Link><span className="block text-xs font-normal text-muted">{row.username}</span></td>
              <td className="py-2 text-right tabular-nums">{row.roundPoints}</td>
              <td className="py-2 text-right tabular-nums">{row.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
