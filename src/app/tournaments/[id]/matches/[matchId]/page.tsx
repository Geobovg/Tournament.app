import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipForm } from "@/components/clip-form";
import { MatchActions } from "@/components/match-actions";
import { ThemeBackdrop, ThemePanel } from "@/components/tournament-theme";
import { cardClass } from "@/components/ui";
import { tournamentThemes } from "@/lib/theme";
import {
  getMatch,
  getTournament,
  listGoalClips,
  listMatches,
  listTeams,
} from "@/lib/data";
import { matchStatusLabel, resultTypeLabel, typeLabel } from "@/lib/labels";
import { toYouTubeEmbedUrl } from "@/lib/video";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: PageProps<"/tournaments/[id]/matches/[matchId]">) {
  const { id, matchId } = await params;

  const [tournament, match] = await Promise.all([
    getTournament(id),
    getMatch(matchId),
  ]);
  if (!tournament || !match || match.tournament_id !== id) notFound();

  const [teams, allMatches, clips] = await Promise.all([
    listTeams(id),
    listMatches(id),
    listGoalClips([matchId]),
  ]);

  const teamNames = new Map(teams.map((team) => [team.id, team.name]));
  const homeTeam = match.home_team_id
    ? { id: match.home_team_id, name: teamNames.get(match.home_team_id) ?? "Ukjent" }
    : null;
  const awayTeam = match.away_team_id
    ? { id: match.away_team_id, name: teamNames.get(match.away_team_id) ?? "Ukjent" }
    : null;

  const tieLegs = match.tie_id
    ? allMatches.filter((row) => row.tie_id === match.tie_id)
    : [match];
  const lastLeg = Math.max(...tieLegs.map((leg) => leg.leg_number));
  const showPenalties =
    tournament.type === "fifa" &&
    match.stage === "knockout" &&
    match.leg_number === lastLeg;

  const otherLegs = tieLegs.filter((leg) => leg.id !== match.id);
  const extra = resultTypeLabel(match);

  return (
    <div data-theme={tournament.type} className="mx-auto grid max-w-2xl gap-6">
      <ThemeBackdrop />
      <div>
        <Link
          href={`/tournaments/${id}`}
          className="text-sm text-muted hover:underline"
        >
          ← {tournament.name}
        </Link>
        <p className="mt-2 text-sm text-muted">
          {tournamentThemes[tournament.type].emoji} {typeLabel(tournament.type)} ·{" "}
          {match.stage === "league"
            ? `Ligaspill, runde ${match.round_number}`
            : `Sluttspill${tieLegs.length > 1 ? `, kamp ${match.leg_number} av duellen` : ""}`}
        </p>
      </div>

      <ThemePanel type={tournament.type}>
        <div className="flex items-center justify-between gap-4 text-lg font-semibold">
          <span className="flex-1">{homeTeam?.name ?? "—"}</span>
          <span className="font-mono text-3xl">
            {match.status === "scheduled"
              ? "–"
              : `${match.home_score}–${match.away_score}`}
          </span>
          <span className="flex-1 text-right">{awayTeam?.name ?? "—"}</span>
        </div>
        <p className="mt-2 text-center text-sm text-white/75">
          {extra ?? matchStatusLabel(match)}
        </p>

        {otherLegs.length > 0 ? (
          <div className="mt-4 border-t border-white/20 pt-3 text-sm text-white/75">
            <p className="mb-1 font-medium text-white">Andre kamper i duellen</p>
            <ul className="grid gap-1">
              {otherLegs.map((leg) => (
                <li key={leg.id}>
                  Kamp {leg.leg_number}:{" "}
                  {teamNames.get(leg.home_team_id ?? "") ?? "?"}{" "}
                  {leg.status === "scheduled"
                    ? "–"
                    : `${leg.home_score}–${leg.away_score}`}{" "}
                  {teamNames.get(leg.away_team_id ?? "") ?? "?"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ThemePanel>

      {match.is_bye ? (
        <div className={cardClass}>
          <p className="text-muted">
            {homeTeam?.name} har fri denne runden og går automatisk videre.
          </p>
        </div>
      ) : null}

      {!match.is_bye && match.status !== "confirmed" && homeTeam && awayTeam ? (
        <div className={cardClass}>
          <MatchActions
            tournamentId={id}
            matchId={matchId}
            status={match.status}
            isNhl={tournament.type === "nhl"}
            showPenalties={showPenalties}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        </div>
      ) : null}

      {!match.is_bye && homeTeam && awayTeam ? (
        <div className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold">Målvideo</h2>

          {clips.length > 0 ? (
            <ul className="mb-6 grid gap-4">
              {clips.map((clip) => {
                const embedUrl = toYouTubeEmbedUrl(clip.video_url);
                return (
                  <li key={clip.id} className="grid gap-2">
                    <p className="font-medium">{teamNames.get(clip.team_id)}</p>
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        title={`Mål fra ${teamNames.get(clip.team_id) ?? "lag"}`}
                        allowFullScreen
                        className="aspect-video w-full rounded-lg border border-border"
                      />
                    ) : (
                      <a
                        href={clip.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline"
                      >
                        Se målet ↗
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mb-6 text-muted">Ingen målvideo lagt inn for denne kampen.</p>
          )}

          <ClipForm
            tournamentId={id}
            matchId={matchId}
            teams={[homeTeam, awayTeam]}
          />
        </div>
      ) : null}
    </div>
  );
}
