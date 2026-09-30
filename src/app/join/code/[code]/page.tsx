import { notFound, redirect } from "next/navigation";
import { cardClass } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getTournamentByInviteCode, recordFailedInviteCode, tooManyFailedInviteCodes } from "@/lib/data";
import { validInviteCode } from "@/lib/invite-code";

export default async function JoinCodePage({ params }: PageProps<"/join/code/[code]">) {
  const { code } = await params;
  // Innlogging først, så det ikke går an å sjekke koder uten konto.
  const user = await currentUser();
  if (!user) redirect(`/login?next=/join/code/${encodeURIComponent(code)}`);
  if (!validInviteCode(code)) notFound();
  if (await tooManyFailedInviteCodes(user.id)) {
    return <div className="mx-auto grid max-w-md gap-5"><h1 className="text-2xl font-semibold">For mange forsøk</h1><section className={cardClass}><p className="text-muted">Du har prøvd for mange invitasjonskoder som ikke finnes. Vent en time, eller be arrangøren om invitasjonslenken.</p></section></div>;
  }

  const tournament = await getTournamentByInviteCode(code);
  if (!tournament) {
    await recordFailedInviteCode(user.id);
    notFound();
  }
  redirect(`/join/${tournament.invite_token}`);
}
