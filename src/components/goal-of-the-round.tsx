import { getT } from "@/i18n/server";
import type { GoalClip, Match, Vote } from "@/lib/tournament/types";
import { toYouTubeEmbedUrl } from "@/lib/video";
import { VoteButton } from "./vote-button";

export async function GoalOfTheRound({
  clips,
  matches,
  teamNames,
  votes,
  myVoteClipId,
}: {
  clips: GoalClip[];
  matches: Match[];
  teamNames: Map<string, string>;
  votes: Vote[];
  myVoteClipId: string | null;
}) {
  const t = await getT();
  if (clips.length === 0) {
    return (
      <p className="text-sm text-muted">
        {t.tournaments.voting.noClipsRound}
      </p>
    );
  }

  const voteCounts = new Map<string, number>();
  for (const vote of votes) {
    voteCounts.set(
      vote.goal_clip_id,
      (voteCounts.get(vote.goal_clip_id) ?? 0) + 1,
    );
  }

  const mostVotes = Math.max(0, ...clips.map((clip) => voteCounts.get(clip.id) ?? 0));

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {clips.map((clip) => {
        const match = matches.find((row) => row.id === clip.match_id);
        const opponentId =
          match?.home_team_id === clip.team_id
            ? match?.away_team_id
            : match?.home_team_id;
        const embedUrl = toYouTubeEmbedUrl(clip.video_url);
        const count = voteCounts.get(clip.id) ?? 0;
        const leading = mostVotes > 0 && count === mostVotes;

        return (
          <li
            key={clip.id}
            className={`grid gap-3 rounded-xl border p-4 ${
              leading ? "border-accent bg-accent-soft" : "border-border"
            }`}
          >
            <div>
              <p className="font-medium">
                {teamNames.get(clip.team_id) ?? t.tournaments.unknownTeam}
                {leading ? " 🏆" : ""}
              </p>
              {opponentId ? (
                <p className="text-sm text-muted">
                  {t.tournaments.voting.against(teamNames.get(opponentId) ?? t.tournaments.unknownLower)}
                </p>
              ) : null}
            </div>

            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={t.tournaments.goalFrom(teamNames.get(clip.team_id) ?? t.tournaments.teamFallback)}
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
                {t.tournaments.watchGoal}
              </a>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">
                {t.tournaments.votes(count)}
              </span>
              <VoteButton clipId={clip.id} isMyVote={myVoteClipId === clip.id} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
