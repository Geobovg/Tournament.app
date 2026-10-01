import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FixtureTime } from "@/components/fantasy-leagues";
import { cardClass, secondaryButtonClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { FANTASY_COMPETITIONS } from "@/lib/fantasy/competitions";
import { currentRound, getCurrentFantasySeason, listRoundFixtures, nextRound } from "@/lib/fantasy/data";

export const dynamic = "force-dynamic";

export default async function FantasyFixturesPage({ searchParams }: PageProps<"/fantasy/fixtures">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const t = await getT();
  const text = t.fantasy.fixturesPage;
  const season = await getCurrentFantasySeason();
  if (!season || !season.rounds.length) return <div className={cardClass}><p className="text-muted">{t.fantasy.noSeason}</p></div>;
  const params = await searchParams;
  const fallback = currentRound(season) && !currentRound(season)!.finished ? currentRound(season)! : nextRound(season) ?? currentRound(season)!;
  const round = season.rounds.find((item) => item.number === Number(params.round)) ?? fallback;
  const fixtures = await listRoundFixtures(season, round.number);
  const previous = season.rounds.find((item) => item.number === round.number - 1);
  const next = season.rounds.find((item) => item.number === round.number + 1);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {previous ? <Link href={`/fantasy/fixtures?round=${previous.number}`} className={secondaryButtonClass}>{t.fantasy.pointsPage.previous}</Link> : <span />}
        <h2 className="text-xl font-bold">{t.fantasy.round(round.number)}</h2>
        {next ? <Link href={`/fantasy/fixtures?round=${next.number}`} className={secondaryButtonClass}>{t.fantasy.pointsPage.next}</Link> : <span />}
      </div>
      {fixtures.length === 0 ? <div className={cardClass}><p className="text-muted">{text.none}</p></div> : null}
      {FANTASY_COMPETITIONS.map((competition) => {
        const list = fixtures.filter((fixture) => fixture.competition === competition.code);
        if (!list.length) return null;
        return (
          <section key={competition.code} className={`${cardClass} grid gap-2`}>
            <h3 className="font-semibold">{competition.name}</h3>
            <ul className="grid gap-1">
              {list.map((fixture) => (
                <li key={fixture.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-raised">
                  <span className="flex min-w-0 items-center justify-end gap-2 text-right"><span className="truncate">{fixture.home.name}</span>{fixture.home.crest ? <Image src={fixture.home.crest} alt="" width={20} height={20} className="h-5 w-5 object-contain" /> : null}</span>
                  <span className="min-w-20 text-center font-semibold tabular-nums">
                    {fixture.state === "upcoming" ? <FixtureTime at={fixture.kickoffAt} /> : fixture.state === "cancelled" ? <span className="text-xs text-muted">{text.postponed}</span> : `${fixture.home.goals ?? 0}–${fixture.away.goals ?? 0}`}
                    {fixture.state === "live" ? <span className="block text-[10px] font-bold uppercase text-red-500">{text.live}</span> : fixture.state === "finished" ? <span className="block text-[10px] text-muted">{text.finished}</span> : null}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">{fixture.away.crest ? <Image src={fixture.away.crest} alt="" width={20} height={20} className="h-5 w-5 object-contain" /> : null}<span className="truncate">{fixture.away.name}</span></span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
