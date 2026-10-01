import { notFound, redirect } from "next/navigation";
import { JoinLeagueButton } from "@/components/fantasy-leagues";
import { cardClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { recordFailedInviteCode, tooManyFailedInviteCodes } from "@/lib/data";
import { getLeagueByCode } from "@/lib/fantasy/data";
import { validInviteCode } from "@/lib/invite-code";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Invitasjonslenke til en fantasy-liga. Ligger under /join/ så innloggingen sender deg tilbake hit.
export default async function JoinFantasyLeaguePage({ params }: PageProps<"/join/fantasy/[code]">) {
  const { code } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/join/fantasy/${encodeURIComponent(code)}`);
  if (!validInviteCode(code)) notFound();
  const t = await getT();
  if (await tooManyFailedInviteCodes(user.id)) {
    return <div className="mx-auto grid max-w-md gap-5"><h1 className="text-2xl font-semibold">{t.auth.join.tooManyAttemptsTitle}</h1><section className={cardClass}><p className="text-muted">{t.auth.join.tooManyAttemptsText}</p></section></div>;
  }
  const league = await getLeagueByCode(code);
  if (!league) {
    await recordFailedInviteCode(user.id);
    notFound();
  }
  // Er du allerede med, går du rett til ligaen.
  const { data: member } = await supabaseAdmin().from("fantasy_league_members").select("user_id").eq("league_id", league.id).eq("user_id", user.id).maybeSingle();
  if (member) redirect(`/fantasy/leagues/${league.id}`);

  return (
    <div className="mx-auto grid max-w-md gap-5">
      <h1 className="text-2xl font-semibold">{t.fantasy.join.title(league.name)}</h1>
      <section className={`${cardClass} grid gap-4`}>
        <p className="text-muted">{t.fantasy.join.text}</p>
        <JoinLeagueButton code={code.toUpperCase()} />
      </section>
    </div>
  );
}
