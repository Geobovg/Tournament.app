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
}: {
  stage: MatchStage;
  roundNumber: number;
  matches: Match[];
  clips: GoalClip[];
  votes: Vote[];
  teamNames: Map<string, string>;
  voterId: string | null;
  defaultOpen: boolean;
}) {
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
          <span className="text-muted">
            Rundens mål – ingen målvideoer lagt inn ennå
          </span>
        ) : myVoteClipId ? (
          <>
            Rundens mål ({roundClips.length} klipp) ·{" "}
            <span className="text-accent">du har stemt ✓</span>
          </>
        ) : (
          <span className="text-accent">
            Stem på rundens mål ({roundClips.length} klipp)
          </span>
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
}: {
  legs: Match[];
  teamNames: Map<string, string>;
  tournament: Tournament;
}) {
  const state = resolveTie(legs, tournament.type);
  const first = legs[0];
  const homeName = first.home_team_id ? teamNames.get(first.home_team_id) : null;
  const awayName = first.away_team_id ? teamNames.get(first.away_team_id) : null;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-medium">
          {first.is_bye ? `${homeName} (fribytte)` : `${homeName} mot ${awayName}`}
        </p>
        {state.decided && state.winnerTeamId ? (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            {teamNames.get(state.winnerTeamId)} videre
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

  const [teams, matches, votes, members] = await Promise.all([
    listTeams(id),
    listMatches(id),
    listVotes(id),
    listTournamentMembers(id),
  ]);
  const isOwner = tournament.owner_id === user.id;
  const myMembership = members.find((member) => member.user_id === user.id);
  if (!isOwner && !myMembership) redirect("/");
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
        winnerName={teamNames.get(champion) ?? "Ukjent lag"}
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
        meta={`${typeLabel(tournament.type)} · ${statusLabel(tournament.status)} · ${namedTeams.length}/${tournament.max_teams} lag`}
        back={
          <Link href="/" className="text-sm text-muted hover:underline">
            ← Alle turneringer
          </Link>
        }
        actions={
          <div className="flex items-center gap-2"><Link href={`/tournaments/${id}/stats`} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium backdrop-blur-sm hover:bg-surface-raised">Statistikk</Link>{isOwner ? <TournamentSettings tournamentId={id} tournamentName={tournament.name} inviteToken={tournament.invite_token} inviteCode={tournament.invite_code} members={members.filter((member) => member.user_id !== user.id)} registrationOpen={tournament.status === "registration"} /> : null}</div>
        }
      />

      {tournament.status === "registration" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <section className={cardClass}>
            <h2 className="mb-4 text-lg font-semibold">Velg laget ditt</h2>
            {myMembership ? <TeamPicker tournamentId={id} teamSize={tournament.team_size} slots={slots} myTeamId={myMembership.team_id} joined /> : isOwner ? <JoinTournamentForm tournamentId={id} inviteToken="" /> : null}
          </section>

          <section className={cardClass}>
            <h2 className="mb-4 text-lg font-semibold">
              Lag ({slots.filter((slot) => slot.name).length}/{tournament.max_teams})
            </h2>
              <ul className="mb-5 grid gap-2">
                {slots.map((team, index) => (
                  <li
                    key={team.id}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex justify-between gap-3"><span>{team.name ?? `Lag ${index + 1}`}</span><span className="text-muted">{team.members.length}/{tournament.team_size}</span></div>
                    {team.members.length > 0 ? <p className="mt-1 text-xs text-muted">{team.members.map((member) => member.username).join(", ")}</p> : null}
                  </li>
                ))}
              </ul>

            <p className="mb-4 text-sm text-muted">
              Med {tournament.max_teams} lag går topp {knockoutCutoff(tournament.max_teams)} videre
              til sluttspillet. Sluttspillet spilles med{" "}
              {tournament.legs_per_knockout_round === 2 ? "2 kamper" : "1 kamp"} per
              duell (finalen alltid 1 kamp).
            </p>

            {isOwner ? <LockRegistrationForm tournamentId={id} ready={registrationReady} /> : <p className="text-sm text-muted">Arrangøren starter turneringen når alle lag er klare.</p>}
          </section>
        </div>
      ) : null}

      {leagueMatches.length > 0 ? (
        <section className={`${cardClass} min-w-0`}>
          <h2 className="mb-4 text-lg font-semibold">Tabell</h2>
          <StandingsTable
            rows={standings}
            type={tournament.type}
            qualifiedCount={tournament.status === "league" ? cutoff : undefined}
          />
        </section>
      ) : null}

      {leagueMatches.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Ligaspill</h2>
          {[...groupByRound(leagueMatches).entries()].map(
            ([roundNumber, roundMatches]) => (
              <div key={roundNumber} className={cardClass}>
                <h3 className="mb-3 font-medium">Runde {roundNumber}</h3>
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
                />
              </div>
            ),
          )}
        </section>
      ) : null}

      {knockoutMatches.length > 0 ? (
        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Sluttspill</h2>
          {[...knockoutRounds.entries()].map(([roundNumber, roundMatches]) => {
            const ties = groupByTie(roundMatches);
            return (
              <div key={roundNumber} className={cardClass}>
                <h3 className="mb-3 font-medium">
                  {knockoutRoundLabel(ties.length)}
                </h3>
                <div className="grid gap-3">
                  {ties.map((legs) => (
                    <KnockoutTie
                      key={legs[0].tie_id ?? legs[0].id}
                      legs={legs}
                      teamNames={teamNames}
                      tournament={tournament}
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
                />
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
