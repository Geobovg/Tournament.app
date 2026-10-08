import { notFound, redirect } from "next/navigation";
import { FiveJoinByCode } from "@/components/femmer/five-join";
import { cardClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { recordFailedInviteCode, tooManyFailedInviteCodes } from "@/lib/data";
import { validInviteCode } from "@/lib/invite-code";
import { getFiveState } from "@/lib/femmer/data";
import { getFiveSeasonByCode } from "@/lib/femmer/seasons";

export const dynamic = "force-dynamic";

// Invitasjonslenke til en vennesesong i Femmer. Ligger under /join/ så innloggingen sender deg tilbake hit.
export default async function JoinFemmerSeasonPage({ params }: PageProps<"/join/femmer/[code]">) {
  const { code } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/join/femmer/${encodeURIComponent(code)}`);
  if (!validInviteCode(code)) notFound();
  const t = await getT();
  if (await tooManyFailedInviteCodes(user.id)) {
    return <div className="mx-auto grid max-w-md gap-5"><h1 className="text-2xl font-semibold">{t.auth.join.tooManyAttemptsTitle}</h1><section className={cardClass}><p className="text-muted">{t.auth.join.tooManyAttemptsText}</p></section></div>;
  }
  const season = await getFiveSeasonByCode(code);
  if (!season) {
    await recordFailedInviteCode(user.id);
    notFound();
  }
  if (season.members.some((member) => member.userId === user.id && member.status === "joined")) redirect(`/femmer/sesong/${season.id}`);
  const started = Boolean(await getFiveState(user.id));
  const copy = t.femmer.seasons;
  return <div className="mx-auto grid max-w-md gap-5">
    <h1 className="text-2xl font-semibold">{copy.joinTitle(season.name)}</h1>
    <section className={`${cardClass} grid gap-4`}>
      {season.status !== "open" ? <p className="text-muted">{t.femmer.errors.seasonStarted}</p> : !started ? <p className="text-muted">{copy.startFirst}</p> : <>
        <p className="text-muted">{copy.joinText(season.ownerName, season.members.filter((member) => member.status === "joined").length)}</p>
        <FiveJoinByCode code={code.toUpperCase()} />
      </>}
    </section>
  </div>;
}
