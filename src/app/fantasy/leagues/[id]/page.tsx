import { notFound, redirect } from "next/navigation";
import { InviteBox, LeaveOrDeleteLeague } from "@/components/fantasy-leagues";
import { FantasyStandings } from "@/components/fantasy-standings";
import { cardClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { getCurrentFantasySeason, getLeague, standings } from "@/lib/fantasy/data";

export const dynamic = "force-dynamic";

export default async function FantasyLeaguePage({ params }: PageProps<"/fantasy/leagues/[id]">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const t = await getT();
  const text = t.fantasy.leagues;
  const { id } = await params;
  const [season, league] = await Promise.all([getCurrentFantasySeason(), /^[0-9a-f-]{36}$/i.test(id) ? getLeague(id) : null]);
  // Bare medlemmer ser ligaen.
  if (!season || !league || !league.memberIds.includes(user.id)) notFound();
  const rows = await standings(season, league.memberIds, league.startRound);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <section className={`${cardClass} grid content-start gap-3`}>
        <div><h2 className="text-lg font-semibold">{league.name}</h2><p className="text-sm text-muted">{text.members(league.memberCount)} · {text.startsFrom(league.startRound)}</p></div>
        <FantasyStandings rows={rows} userId={user.id} t={t} />
      </section>
      <div className="grid content-start gap-6">
        <section className={`${cardClass} grid gap-3`}>
          <div><h2 className="font-semibold">{text.invite}</h2><p className="text-sm text-muted">{text.inviteText}</p></div>
          <InviteBox code={league.inviteCode} />
        </section>
        <LeaveOrDeleteLeague leagueId={league.id} owner={league.ownerId === user.id} />
      </div>
    </div>
  );
}
