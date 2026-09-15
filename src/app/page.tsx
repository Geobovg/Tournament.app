import Link from "next/link";
import { buttonClass, cardClass } from "@/components/ui";
import { listTournaments } from "@/lib/data";
import { statusLabel, typeLabel } from "@/lib/labels";
import type { Tournament } from "@/lib/tournament/types";

export const dynamic = "force-dynamic";

function TournamentCard({ tournament }: { tournament: Tournament }) {
  return (
    <li>
      <Link
        href={`/tournaments/${tournament.id}`}
        data-theme={tournament.type}
        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition hover:bg-surface-raised"
      >
        <div>
          <p className="font-medium">{tournament.name}</p>
          <p className="text-sm text-muted">{statusLabel(tournament.status)}</p>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
          {typeLabel(tournament.type)}
        </span>
      </Link>
    </li>
  );
}

export default async function HomePage() {
  const tournaments = await listTournaments();
  const active = tournaments.filter((row) => row.status !== "completed");
  const archived = tournaments.filter((row) => row.status === "completed");

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Turneringer</h1>
          <p className="text-muted">FIFA- og NHL-turneringer med liga og sluttspill.</p>
        </div>
        <Link href="/tournaments/new" className={buttonClass}>
          Opprett turnering
        </Link>
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
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </ul>
        </section>
      ) : null}

      {archived.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Arkiv</h2>
          <ul className="grid gap-3">
            {archived.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
