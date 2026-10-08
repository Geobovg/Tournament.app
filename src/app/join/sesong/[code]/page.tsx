import { notFound, redirect } from "next/navigation";
import { JoinFriendSeasonButton } from "@/components/season-panels";
import { cardClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { recordFailedInviteCode, tooManyFailedInviteCodes } from "@/lib/data";
import { validInviteCode } from "@/lib/invite-code";
import { getFriendSeasonByCode } from "@/lib/seasons";

export const dynamic = "force-dynamic";

// Invitasjonslenke til en vennesesong. Ligger under /join/ så innloggingen sender deg tilbake hit.
export default async function JoinFriendSeasonPage({ params }: PageProps<"/join/sesong/[code]">) {
  const { code } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/join/sesong/${encodeURIComponent(code)}`);
  if (!validInviteCode(code)) notFound();
  const t = await getT();
  if (await tooManyFailedInviteCodes(user.id)) {
    return <div className="mx-auto grid max-w-md gap-5"><h1 className="text-2xl font-semibold">{t.auth.join.tooManyAttemptsTitle}</h1><section className={cardClass}><p className="text-muted">{t.auth.join.tooManyAttemptsText}</p></section></div>;
  }
  const season = await getFriendSeasonByCode(code);
  if (!season) {
    await recordFailedInviteCode(user.id);
    notFound();
  }
  // Er du allerede med, går du rett til vennesesongene.
  if (season.members.some((member) => member.user_id === user.id && member.status === "joined")) redirect("/managerkarriere/sesong?tab=venner");
  const copy = t.seasons.joinLink;
  const joined = season.members.filter((member) => member.status === "joined").length;

  return (
    <div className="mx-auto grid max-w-md gap-5">
      <h1 className="text-2xl font-semibold">{copy.title(season.name)}</h1>
      <section className={`${cardClass} grid gap-4`}>
        {season.status === "open" ? <>
          <p className="text-muted">{copy.text(season.owner, joined)}</p>
          <JoinFriendSeasonButton code={code.toUpperCase()} />
        </> : <p className="text-muted">{t.seasons.errors.seasonAlreadyStarted}</p>}
      </section>
    </div>
  );
}
