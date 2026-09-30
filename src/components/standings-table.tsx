import { getT } from "@/i18n/server";
import type { StandingRow } from "@/lib/tournament/standings";
import type { TournamentType } from "@/lib/tournament/types";

export async function StandingsTable({
  rows,
  type,
  qualifiedCount,
}: {
  rows: StandingRow[];
  type: TournamentType;
  qualifiedCount?: number;
}) {
  const isNhl = type === "nhl";
  const text = (await getT()).tournaments.standings;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">{text.team}</th>
            <th className="py-2 pr-2 text-right font-medium">{text.played}</th>
            <th className="py-2 pr-2 text-right font-medium">{text.won}</th>
            {isNhl ? null : (
              <th className="py-2 pr-2 text-right font-medium">{text.drawn}</th>
            )}
            {isNhl ? (
              <th className="py-2 pr-2 text-right font-medium">{text.otLosses}</th>
            ) : null}
            <th className="py-2 pr-2 text-right font-medium">{text.lost}</th>
            <th className="py-2 pr-2 text-right font-medium">{text.goalsFor}</th>
            <th className="py-2 pr-2 text-right font-medium">{text.goalsAgainst}</th>
            <th className="py-2 pr-2 text-right font-medium">{text.goalDifference}</th>
            <th className="py-2 pr-2 text-right font-medium">{text.cleanSheets}</th>
            <th className="py-2 pr-2 text-right font-medium">{text.points}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const qualified =
              qualifiedCount !== undefined && index < qualifiedCount;
            return (
              <tr
                key={row.teamId}
                className={`border-b border-border/60 ${
                  qualified ? "bg-accent-soft" : ""
                }`}
              >
                <td className="py-2 pr-2 text-muted">{index + 1}</td>
                <td className="py-2 pr-2 font-medium">{row.teamName}</td>
                <td className="py-2 pr-2 text-right">{row.played}</td>
                <td className="py-2 pr-2 text-right">{row.won}</td>
                {isNhl ? null : (
                  <td className="py-2 pr-2 text-right">{row.drawn}</td>
                )}
                {isNhl ? (
                  <td className="py-2 pr-2 text-right">{row.otLosses}</td>
                ) : null}
                <td className="py-2 pr-2 text-right">{row.lost}</td>
                <td className="py-2 pr-2 text-right">{row.goalsFor}</td>
                <td className="py-2 pr-2 text-right">{row.goalsAgainst}</td>
                <td className="py-2 pr-2 text-right">
                  {row.goalDifference > 0 ? "+" : ""}
                  {row.goalDifference}
                </td>
                <td className="py-2 pr-2 text-right">{row.cleanSheets}</td>
                <td className="py-2 pr-2 text-right font-semibold">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-sm text-muted">
        {text.legend(isNhl)}
        {qualifiedCount !== undefined ? text.qualified(qualifiedCount) : ""}
      </p>
    </div>
  );
}
