import { notFound, redirect } from "next/navigation";
import { JoinTournamentForm } from "@/components/registration-forms";
import { cardClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { getTournamentByInvite } from "@/lib/data";

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const tournament = await getTournamentByInvite(token);
  if (!tournament || tournament.status !== "registration") notFound();
  if (!(await currentUser())) redirect(`/login?next=/join/${token}`);
  const t = await getT();
  return <div className="mx-auto grid max-w-md gap-5"><div><h1 className="text-2xl font-semibold">{t.auth.join.title}</h1><p className="text-muted">{tournament.name}</p></div><section className={cardClass}><JoinTournamentForm tournamentId={tournament.id} inviteToken={token} /></section></div>;
}
