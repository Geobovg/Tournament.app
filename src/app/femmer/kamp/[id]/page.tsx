import { notFound, redirect } from "next/navigation";
import { FiveMatch } from "@/components/femmer/five-match";
import { currentUser } from "@/lib/auth";
import { getFiveMatch } from "@/lib/femmer/data";
import { settleIfFinished } from "@/lib/femmer/live";

export const dynamic = "force-dynamic";

export default async function FemmerMatchPage({ params }: PageProps<"/femmer/kamp/[id]">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  let match = await getFiveMatch(id, user.id);
  if (!match?.data) notFound();
  // En kamp som er ferdig på klokka, men ikke gjort opp (siden ble lukket underveis), gjøres opp nå.
  if (match.status === "live" && (await settleIfFinished(id))) match = (await getFiveMatch(id, user.id))!;
  const viewerSide = match.homeUserId === user.id ? "home" : match.awayUserId === user.id ? "away" : null;
  const coins = viewerSide === "home" ? match.coins : viewerSide === "away" ? match.awayCoins : 0;
  // Etter en sesongkamp går man tilbake til sesongen, ellers til Femmer.
  // Klokka forankres i serverens tid, så en nettleser som går feil ikke flytter kampminuttet.
  return <div className="mx-auto grid w-full max-w-5xl gap-5"><FiveMatch key={match.status} matchId={match.id} match={match.data!} initialShots={match.shots} initialTactics={match.tactics} status={match.status} startedAt={match.startedAt} serverNow={match.serverNow} isController={match.controllerId === user.id} viewerSide={viewerSide} coins={coins} returnPath={match.seasonId ? `/femmer/sesong/${match.seasonId}` : "/femmer"} season={Boolean(match.seasonId)} /></div>;
}
