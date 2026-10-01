import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateLeagueForm, JoinLeagueForm } from "@/components/fantasy-leagues";
import { FantasyStandings } from "@/components/fantasy-standings";
import { cardClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { getCurrentFantasySeason, listMyLeagues, standings } from "@/lib/fantasy/data";

export const dynamic = "force-dynamic";

export default async function FantasyLeaguesPage({ searchParams }: PageProps<"/fantasy/leagues">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const t = await getT();
  const text = t.fantasy.leagues;
  const season = await getCurrentFantasySeason();
  if (!season) return <div className={cardClass}><p className="text-muted">{t.fantasy.noSeason}</p></div>;
  const [leagues, overall] = await Promise.all([listMyLeagues(user.id, season.apiSeason), standings(season, null)]);
  const showAll = (await searchParams).all === "1";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <section className={`${cardClass} grid content-start gap-3`}>
        <div><h2 className="text-lg font-semibold">{text.overall}</h2><p className="text-sm text-muted">{text.overallText}</p></div>
        <FantasyStandings rows={overall} userId={user.id} t={t} limit={showAll ? undefined : 50} />
        {!showAll && overall.length > 50 ? <Link href="/fantasy/leagues?all=1" className="text-sm font-medium text-accent hover:underline">{text.showAll}</Link> : null}
      </section>
      <div className="grid content-start gap-6">
        <section className={`${cardClass} grid gap-3`}>
          <h2 className="text-lg font-semibold">{text.mine}</h2>
          {leagues.length === 0 ? <p className="text-sm text-muted">{text.none}</p> : (
            <ul className="grid gap-2">
              {leagues.map((league) => (
                <li key={league.id}><Link href={`/fantasy/leagues/${league.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 transition hover:bg-surface-raised"><span className="font-medium">{league.name}</span><span className="text-xs text-muted">{text.members(league.memberCount)}</span></Link></li>
              ))}
            </ul>
          )}
        </section>
        <section className={`${cardClass} grid gap-3`}>
          <h2 className="font-semibold">{text.create}</h2>
          <CreateLeagueForm />
          <h2 className="mt-2 font-semibold">{text.join}</h2>
          <JoinLeagueForm />
        </section>
      </div>
    </div>
  );
}
