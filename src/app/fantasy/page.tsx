import { redirect } from "next/navigation";
import { FantasyDeadline } from "@/components/fantasy-nav";
import { FantasyTeamBuilder } from "@/components/fantasy-team-builder";
import { cardClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { getCurrentFantasySeason, getFantasyTeam, listFantasyPlayers, nextRound, roundFixturesByClub } from "@/lib/fantasy/data";

export const dynamic = "force-dynamic";

export default async function FantasyPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const t = await getT();
  const season = await getCurrentFantasySeason();
  if (!season) return <div className={cardClass}><p className="text-muted">{t.fantasy.noSeason}</p></div>;
  const upcoming = nextRound(season);
  const [players, team, fixtures] = await Promise.all([
    listFantasyPlayers(season.apiSeason, season.now),
    getFantasyTeam(user.id, season),
    upcoming ? roundFixturesByClub(season.apiSeason, upcoming.number) : {},
  ]);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">{t.fantasy.season(season.label)}{season.simulated ? ` · ${t.fantasy.testSeason}` : ""}</p>
      {upcoming ? <FantasyDeadline round={upcoming.number} deadlineAt={upcoming.deadlineAt} now={season.now} /> : season.rounds.length ? <div className={cardClass}><p>{t.fantasy.seasonOver}</p></div> : null}
      <FantasyTeamBuilder players={players} team={team} round={upcoming?.number ?? (season.rounds.length ? null : 1)} fixtures={fixtures} />
    </div>
  );
}
