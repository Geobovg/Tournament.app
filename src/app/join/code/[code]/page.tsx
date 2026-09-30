import { notFound, redirect } from "next/navigation";
import { cardClass } from "@/components/ui";
import { getT } from "@/i18n/server";
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
    const t = await getT();
    return <div className="mx-auto grid max-w-md gap-5"><h1 className="text-2xl font-semibold">{t.auth.join.tooManyAttemptsTitle}</h1><section className={cardClass}><p className="text-muted">{t.auth.join.tooManyAttemptsText}</p></section></div>;
  }

  const tournament = await getTournamentByInviteCode(code);
  if (!tournament) {
    await recordFailedInviteCode(user.id);
    notFound();
  }
  redirect(`/join/${tournament.invite_token}`);
}
