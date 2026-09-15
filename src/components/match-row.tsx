import Link from "next/link";
import { matchStatusLabel, resultTypeLabel } from "@/lib/labels";
import type { Match } from "@/lib/tournament/types";

export function MatchRow({
  match,
  teamNames,
  tournamentId,
}: {
  match: Match;
  teamNames: Map<string, string>;
  tournamentId: string;
}) {
  const home = match.home_team_id ? teamNames.get(match.home_team_id) : null;
  const away = match.away_team_id ? teamNames.get(match.away_team_id) : null;
  const extra = resultTypeLabel(match);

  if (match.is_bye) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
        <span>{home}</span>
        <span className="text-muted">Fri denne runden</span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={`/tournaments/${tournamentId}/matches/${match.id}`}
        className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm transition hover:bg-surface-raised"
      >
        <span className="flex-1 truncate">{home}</span>
        <span className="font-mono font-semibold">
          {match.status === "scheduled"
            ? "–"
            : `${match.home_score}–${match.away_score}`}
        </span>
        <span className="flex-1 truncate text-right">{away}</span>
        <span className="hidden w-44 shrink-0 text-right text-xs text-muted sm:block">
          {extra ?? matchStatusLabel(match)}
        </span>
      </Link>
    </li>
  );
}
