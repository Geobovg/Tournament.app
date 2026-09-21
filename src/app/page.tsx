import Link from "next/link";
import { CloseTournamentButton } from "@/components/close-tournament-button";
import { TournamentSettings } from "@/components/tournament-settings";
import { buttonClass, cardClass } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { listTournamentMembersFor, listTournamentsForUser } from "@/lib/data";
import { listFriends } from "@/lib/friends";
import { redirect } from "next/navigation";
import { statusLabel, typeLabel } from "@/lib/labels";
import { tournamentThemes } from "@/lib/theme";
import { JoinByCode } from "@/components/join-by-code";
import type { Tournament, TournamentMember } from "@/lib/tournament/types";

export const dynamic = "force-dynamic";

function TournamentCard({
  tournament,
  currentUserId,
  members,
  friends,
  closable,
}: {
  tournament: Tournament;
  currentUserId: string;
  members: TournamentMember[];
  friends: { id: string; username: string }[];
  closable?: boolean;
}) {
  const theme = tournamentThemes[tournament.type];
  const isOwner = tournament.owner_id === currentUserId;
  return (
    <li className="flex items-center gap-2">
      <Link
        href={`/tournaments/${tournament.id}`}
        data-theme={tournament.type}
        className="theme-tile flex min-w-0 flex-1 items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition hover:bg-surface-raised"
      >
        <div className="relative flex items-center gap-3">
          <span className="theme-badge">{theme.emoji}</span>
          <div>
            <p className="font-medium">{tournament.name}</p>
            <p className="text-sm text-muted">{statusLabel(tournament.status)}</p>
          </div>
        </div>
        <span className="relative shrink-0 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
          {typeLabel(tournament.type)}
        </span>
      </Link>
      {closable ? <CloseTournamentButton tournamentId={tournament.id} /> : null}
      {isOwner ? (
        <TournamentSettings
          tournamentId={tournament.id}
          tournamentName={tournament.name}
          inviteToken={tournament.invite_token}
          inviteCode={tournament.invite_code}
          members={members.filter((member) => member.user_id !== currentUserId)}
          friends={friends.filter((friend) => !members.some((member) => member.user_id === friend.id))}
          registrationOpen={tournament.status === "registration"}
        />
      ) : null}
    </li>
  );
}

export default async function HomePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const tournaments = (await listTournamentsForUser(user.id)).filter((row) => !row.closed);
  const active = tournaments.filter((row) => row.status !== "completed");
  const archived = tournaments.filter((row) => row.status === "completed");
  const ownedIds = tournaments.filter((row) => row.owner_id === user.id).map((row) => row.id);
  const [membersByTournament, friends] = await Promise.all([
    listTournamentMembersFor(ownedIds),
    ownedIds.length > 0 ? listFriends(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Turneringer</h1>
          <p className="text-muted">FIFA- og NHL-turneringer med liga og sluttspill.</p>
        </div>
        <div className="flex flex-wrap gap-3"><JoinByCode /><Link href="/tournaments/new" className={buttonClass}>Opprett turnering</Link></div>
      </div>

      {tournaments.length === 0 ? (
        <div className={cardClass}>
          <p className="text-muted">
            Ingen turneringer ennå. Opprett den første for å komme i gang.
          </p>
        </div>
      ) : null}

      {active.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Aktive</h2>
          <ul className="grid gap-3">
            {active.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                currentUserId={user.id}
                members={membersByTournament[tournament.id] ?? []}
                friends={friends}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {archived.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Arkiv</h2>
          <ul className="grid gap-3">
            {archived.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                currentUserId={user.id}
                members={membersByTournament[tournament.id] ?? []}
                friends={friends}
                closable={tournament.owner_id === user.id}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
