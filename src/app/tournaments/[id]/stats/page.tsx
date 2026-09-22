import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ThemeBackdrop, ThemePanel } from "@/components/tournament-theme";
import { cardClass } from "@/components/ui";
import {
  getTournament,
  listGoalClips,
  listMatches,
  listTeams,
  listVotes,
  listTournamentMembers,
} from "@/lib/data";
import { currentUser } from "@/lib/auth";
import { knockoutRoundLabel, typeLabel } from "@/lib/labels";
import { computeStandings } from "@/lib/tournament/standings";
import type { Match } from "@/lib/tournament/types";

export const dynamic = "force-dynamic";

function roundTitle(stage: Match["stage"], roundNumber: number, ties: number) {
  return stage === "league"
    ? `Ligaspill, runde ${roundNumber}`
    : knockoutRoundLabel(ties);
}

export default async function StatsPage({
  params,
}: PageProps<"/tournaments/[id]/stats">) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/tournaments/${id}/stats`);

  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const [teams, matches, votes, members] = await Promise.all([
    listTeams(id),
    listMatches(id),
    listVotes(id),
    listTournamentMembers(id),
  ]);
  if (tournament.owner_id !== user.id && !members.some((member) => member.user_id === user.id)) redirect("/turneringer");
  const clips = await listGoalClips(matches.map((match) => match.id));

  const namedTeams = teams.filter((team): team is typeof team & { name: string } => Boolean(team.name));
  const teamNames = new Map(namedTeams.map((team) => [team.id, team.name]));
  const totals = computeStandings(namedTeams, matches, tournament.type);
  const topScorers = [...totals].sort(
    (a, b) => b.goalsFor - a.goalsFor || a.teamName.localeCompare(b.teamName, "nb"),
  );
  const cleanSheetLeaders = [...totals].sort(
    (a, b) =>
      b.cleanSheets - a.cleanSheets || a.teamName.localeCompare(b.teamName, "nb"),
  );

  const roundKeys = new Map<string, { stage: Match["stage"]; round: number; ties: number }>();
  for (const match of matches) {
    const key = `${match.stage}-${match.round_number}`;
    const existing = roundKeys.get(key);
    const tieCount = new Set(
      matches
        .filter(
          (row) =>
            row.stage === match.stage && row.round_number === match.round_number,
        )
        .map((row) => row.tie_id ?? row.id),
    ).size;
    if (!existing) {
      roundKeys.set(key, {
        stage: match.stage,
        round: match.round_number,
        ties: tieCount,
      });
    }
  }

  const roundWinners = [...roundKeys.values()]
    .map(({ stage, round, ties }) => {
      const roundVotes = votes.filter(
        (vote) => vote.stage === stage && vote.round_number === round,
      );
      if (roundVotes.length === 0) return null;

      const counts = new Map<string, number>();
      for (const vote of roundVotes) {
        counts.set(vote.goal_clip_id, (counts.get(vote.goal_clip_id) ?? 0) + 1);
      }

      const [winningClipId, count] = [...counts.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0];
      const clip = clips.find((row) => row.id === winningClipId);
      if (!clip) return null;

      return {
        title: roundTitle(stage, round, ties),
        teamName: teamNames.get(clip.team_id) ?? "Ukjent lag",
        votes: count,
        url: clip.video_url,
      };
    })
    .filter((row) => row !== null);

  return (
    <div data-theme={tournament.type} className="grid gap-6">
      <ThemeBackdrop />
      <ThemePanel type={tournament.type}>
        <Link
          href={`/tournaments/${id}`}
          className="text-sm text-white/75 hover:underline"
        >
          ← {tournament.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold uppercase tracking-tight">
          Statistikk
        </h1>
        <p className="text-sm text-white/75">
          {typeLabel(tournament.type)} · hele turneringen (liga + sluttspill)
        </p>
      </ThemePanel>

      <div className="grid gap-6 md:grid-cols-2">
        <section className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold">Scorede mål</h2>
          <ul className="grid gap-2">
            {topScorers.map((row) => (
              <li
                key={row.teamId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{row.teamName}</span>
                <span className="font-mono font-semibold">{row.goalsFor}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold">Clean sheets</h2>
          <ul className="grid gap-2">
            {cleanSheetLeaders.map((row) => (
              <li
                key={row.teamId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{row.teamName}</span>
                <span className="font-mono font-semibold">{row.cleanSheets}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={cardClass}>
        <h2 className="mb-4 text-lg font-semibold">Rundens mål</h2>
        {roundWinners.length === 0 ? (
          <p className="text-muted">Ingen avstemninger er avgjort ennå.</p>
        ) : (
          <ul className="grid gap-2">
            {roundWinners.map((row) => (
              <li
                key={row.title}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="text-muted">{row.title}</span>
                <span className="font-medium">{row.teamName}</span>
                <span className="text-muted">
                  {row.votes} {row.votes === 1 ? "stemme" : "stemmer"}
                </span>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  Se målet ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
