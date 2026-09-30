import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GoalOfTheRound } from "@/components/goal-of-the-round";
import { MatchRow } from "@/components/match-row";
import {
  LockRegistrationForm,
  JoinTournamentForm,
  TeamPicker,
} from "@/components/registration-forms";
import { TournamentSettings } from "@/components/tournament-settings";
import { LiveTournament } from "@/components/live-tournament";
import { StandingsTable } from "@/components/standings-table";
import { ThemeBackdrop, TournamentHero } from "@/components/tournament-theme";
import { cardClass } from "@/components/ui";
import { WinnerPage } from "@/components/winner-page";
import {
  getTournament,
  listGoalClips,
  listMatches,
  listTeams,
  listTournamentMembers,
  listVotes,
} from "@/lib/data";
import { currentUser } from "@/lib/auth";
import { getT } from "@/i18n/server";
import type { Dictionary } from "@/i18n/dictionaries";
import { listFriends } from "@/lib/friends";
import { knockoutRoundLabel, statusLabel, typeLabel } from "@/lib/labels";
import { knockoutCutoff } from "@/lib/tournament/bracket";
import { computeStandings } from "@/lib/tournament/standings";
import { resolveTie } from "@/lib/tournament/tie";
import type {
  GoalClip,
  Match,
  MatchStage,
  Tournament,
  Vote,
} from "@/lib/tournament/types";

export const dynamic = "force-dynamic";

function groupByRound(matches: Match[]): Map<number, Match[]> {
  const rounds = new Map<number, Match[]>();
  for (const match of matches) {
    rounds.set(match.round_number, [
      ...(rounds.get(match.round_number) ?? []),
      match,
    ]);
  }
  return new Map([...rounds.entries()].sort((a, b) => a[0] - b[0]));
}

function groupByTie(matches: Match[]): Match[][] {
  const ties = new Map<string, Match[]>();
  for (const match of matches) {
    const key = match.tie_id ?? match.id;
    ties.set(key, [...(ties.get(key) ?? []), match]);
  }
  return [...ties.values()].sort(
    (a, b) => a[0].tie_position - b[0].tie_position,
  );
}

function RoundVoting({
  stage,
  roundNumber,
  matches,
  clips,
  votes,
  teamNames,
  voterId,
  defaultOpen,
  t,
}: {
  stage: MatchStage;
  roundNumber: number;
  matches: Match[];
  clips: GoalClip[];
  votes: Vote[];
  teamNames: Map<string, string>;
  voterId: string | null;
  defaultOpen: boolean;
  t: Dictionary;
}) {
  const text = t.tournaments.voting;
  const matchIds = new Set(matches.map((match) => match.id));
  const roundClips = clips.filter((clip) => matchIds.has(clip.match_id));
  const roundVotes = votes.filter(
    (vote) => vote.stage === stage && vote.round_number === roundNumber,
  );
  const myVoteClipId =
    roundVotes.find((vote) => vote.voter_id === voterId)?.goal_clip_id ?? null;

  return (
    <details
      open={defaultOpen}
      className="mt-4 rounded-lg border border-border p-3"
    >
      <summary className="cursor-pointer text-sm font-medium">
        {roundClips.length === 0 ? (
          <span className="text-muted">{text.noClips}</span>
        ) : myVoteClipId ? (
          <>
            {text.summary(roundClips.length)}
            <span className="text-accent">{text.youVoted}</span>
          </>
        ) : (
          <span className="text-accent">{text.cta(roundClips.length)}</span>
        )}
      </summary>
      <div className="mt-4">
        <GoalOfTheRound
          clips={roundClips}
          matches={matches}
          teamNames={teamNames}
          votes={roundVotes}
          myVoteClipId={myVoteClipId}
        />
      </div>
    </details>
  );
}

function KnockoutTie({
  legs,
  teamNames,
  tournament,
  t,
}: {
  legs: Match[];
  teamNames: Map<string, string>;
  tournament: Tournament;
  t: Dictionary;
}) {
  const text = t.tournaments.detail;
  const state = resolveTie(legs, tournament.type);
  const first = legs[0];
  const homeName = first.home_team_id ? teamNames.get(first.home_team_id) : null;
  const awayName = first.away_team_id ? teamNames.get(first.away_team_id) : null;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-medium">
          {first.is_bye ? text.bye(homeName ?? "") : text.versus(homeName ?? "", awayName ?? "")}
        </p>
        {state.decided && state.winnerTeamId ? (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            {text.advances(teamNames.get(state.winnerTeamId) ?? "")}
          </span>
        ) : null}
      </div>
      <ul className="grid gap-2">
        {legs.map((leg) => (
          <MatchRow
            key={leg.id}
            match={leg}
            teamNames={teamNames}
            tournamentId={tournament.id}
          />
        ))}
      </ul>
    </div>
  );
}

export default async function TournamentPage({
  params,
}: PageProps<"/tournaments/[id]">) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/tournaments/${id}`);
  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const t = await getT();
  const text = t.tournaments.detail;

  const [teams, matches, votes, members] = await Promise.all([
    listTeams(id),
    listMatches(id),
    listVotes(id),
    listTournamentMembers(id),
  ]);
  const isOwner = tournament.owner_id === user.id;
  const myMembership = members.find((member) => member.user_id === user.id);
  if (!isOwner && !myMembership) redirect("/turneringer");
  const friends = isOwner ? await listFriends(user.id) : [];
  const availableFriends = friends.filter((friend) => !members.some((member) => member.user_id === friend.id));
  const clips = await listGoalClips(matches.map((match) => match.id));
  const voterId = user.id;

  const namedTeams = teams.filter((team): team is typeof team & { name: string } => Boolean(team.name));
  const teamNames = new Map(namedTeams.map((team) => [team.id, team.name]));
  const leagueMatches = matches.filter((match) => match.stage === "league");
  const knockoutMatches = matches.filter((match) => match.stage === "knockout");
  const standings = computeStandings(namedTeams, leagueMatches, tournament.type);
  const cutoff = knockoutCutoff(namedTeams.length);
  const slots = teams.map((team) => ({
    ...team,
    members: members.filter((member) => member.team_id === team.id),
  }));
  const hasSelectedTeam = Boolean(myMembership?.team_id);
  const registrationReady = slots.every(
    (slot) => slot.members.length === tournament.team_size && Boolean(slot.name),
  );

  const clipMatchIds = new Set(clips.map((clip) => clip.match_id));
  const newestRoundWithClips = (stageMatches: Match[]) => {
    const rounds = stageMatches
      .filter((match) => clipMatchIds.has(match.id))
      .map((match) => match.round_number);
    return rounds.length > 0 ? Math.max(...rounds) : null;
  };
  const openLeagueVote = newestRoundWithClips(leagueMatches);
  const openKnockoutVote = newestRoundWithClips(knockoutMatches);

  const knockoutRounds = groupByRound(knockoutMatches);
  const lastRound = [...knockoutRounds.values()].at(-1);
  const champion =
    tournament.status === "completed" && lastRound
      ? resolveTie(lastRound, tournament.type).winnerTeamId
      : null;

  if (champion) {
    return (
      <WinnerPage
        type={tournament.type}
        tournamentId={id}
        tournamentName={tournament.name}
        winnerName={teamNames.get(champion) ?? t.tournaments.unknownTeam}
      />
    );
  }

  return (
    <div data-theme={tournament.type} className="grid gap-8">
      <LiveTournament />
      <ThemeBackdrop />
      <TournamentHero
        type={tournament.type}
        title={tournament.name}
        meta={`${typeLabel(tournament.type)} · ${statusLabel(tournament.status, t)} · ${text.teamsMeta(namedTeams.length, tournament.max_teams)}`}
        back={
          <Link href="/turneringer" className="text-sm text-muted hover:underline">
            ← {text.allTournaments}
          </Link>
        }
        t={t}
        actions={
          <div className="flex items-center gap-2"><Link href={`/tournaments/${id}/stats`} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium backdrop-blur-sm hover:bg-surface-raised">{text.stats}</Link>{isOwner ? <TournamentSettings tournamentId={id} tournamentName={tournament.name} inviteToken={tournament.invite_token} inviteCode={tournament.invite_code} members={members.filter((member) => member.user_id !== user.id)} friends={availableFriends} registrationOpen={tournament.status === "registration"} /> : null}</div>
        }
      />

      {tournament.status === "registration" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <section className={cardClass}>
            <h2 className="mb-4 text-lg font-semibold">{text.chooseTeam}</h2>
            {myMembership ? <TeamPicker tournamentId={id} teamSize={tournament.team_size} slots={slots} myTeamId={myMembership.team_id} joined /> : isOwner ? <JoinTournamentForm tournamentId={id} inviteToken="" /> : null}
          </section>

          <section className={cardClass}>
            <h2 className="mb-4 text-lg font-semibold">
              {text.teamsHeading(slots.filter((slot) => slot.name).length, tournament.max_teams)}
            </h2>
              {hasSelectedTeam ? <ul className="mb-5 grid gap-2">
                {slots.map((team, index) => (
                  <li
                    key={team.id}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex justify-between gap-3"><span>{team.name ?? text.teamSlot(index + 1)}</span><span className="text-muted">{team.members.length}/{tournament.team_size}</span></div>
                    {team.members.length > 0 ? <p className="mt-1 text-xs text-muted">{team.members.map((member) => member.username).join(", ")}</p> : null}
                  </li>
                ))}
              </ul> : <p className="mb-5 text-sm text-muted">{text.pickTeamHint}</p>}

            <p className="mb-4 text-sm text-muted">
              {text.knockoutInfo(tournament.max_teams, knockoutCutoff(tournament.max_teams), tournament.legs_per_knockout_round)}
            </p>

            {isOwner ? <LockRegistrationForm tournamentId={id} ready={registrationReady} /> : <p className="text-sm text-muted">{text.ownerStarts}</p>}
          </section>
        </div>
      ) : null}

      {leagueMatches.length > 0 ? (
        <section className={`${cardClass} min-w-0`}>
          <h2 className="mb-4 text-lg font-semibold">{text.table}</h2>
          <StandingsTable
            rows={standings}
            type={tournament.type}
            qualifiedCount={tournament.status === "league" ? cutoff : undefined}
          />
        </section>
      ) : null}

      {leagueMatches.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">{text.league}</h2>
          {[...groupByRound(leagueMatches).entries()].map(
            ([roundNumber, roundMatches]) => (
              <div key={roundNumber} className={cardClass}>
                <h3 className="mb-3 font-medium">{text.round(roundNumber)}</h3>
                <ul className="grid gap-2">
                  {roundMatches.map((match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      teamNames={teamNames}
                      tournamentId={id}
                    />
                  ))}
                </ul>
                <RoundVoting
                  stage="league"
                  roundNumber={roundNumber}
                  matches={roundMatches}
                  clips={clips}
                  votes={votes}
                  teamNames={teamNames}
                  voterId={voterId}
                  defaultOpen={roundNumber === openLeagueVote}
                  t={t}
                />
              </div>
            ),
          )}
        </section>
      ) : null}

      {knockoutMatches.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">{text.knockout}</h2>
          {[...knockoutRounds.entries()].map(([roundNumber, roundMatches]) => {
            const ties = groupByTie(roundMatches);
            return (
              <div key={roundNumber} className={cardClass}>
                <h3 className="mb-3 font-medium">
                  {knockoutRoundLabel(ties.length, t)}
                </h3>
                <div className="grid gap-3">
                  {ties.map((legs) => (
                    <KnockoutTie
                      key={legs[0].tie_id ?? legs[0].id}
                      legs={legs}
                      teamNames={teamNames}
                      tournament={tournament}
                      t={t}
                    />
                  ))}
                </div>
                <RoundVoting
                  stage="knockout"
                  roundNumber={roundNumber}
                  matches={roundMatches}
                  clips={clips}
                  votes={votes}
                  teamNames={teamNames}
                  voterId={voterId}
                  defaultOpen={roundNumber === openKnockoutVote}
                  t={t}
                />
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
