import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getCareerMatch } from "@/lib/career";
import { LiveManagerMatch } from "@/components/live-manager-match";
import { ArenaBanner } from "@/components/arena-scene";
import { getT } from "@/i18n/server";

export default async function CareerMatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ historikk?: string }> }) {
  const user = await currentUser(); if (!user) redirect("/login");
  const { id } = await params; const { historikk } = await searchParams; const match = await getCareerMatch(id, user.id); if (!match) notFound();
  const t = await getT();
  // Overskriften ligger inne i kampvinduet, som fyller skjermen og ikke kan rulles.
  const header = <><div><h1 className="text-2xl font-bold sm:text-3xl">{t.match.page.title(match.home.username, match.away.username)}</h1><p className="text-sm text-muted">{historikk === "1" ? t.match.page.historyIntro : t.match.page.liveIntro}</p></div>{match.arena ? <ArenaBanner arena={match.arena} /> : null}</>;
  return <LiveManagerMatch match={match} userId={user.id} returnAfterComplete={historikk !== "1"} header={header} />;
}
