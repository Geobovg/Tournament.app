import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getCareerMatch } from "@/lib/career";
import { LiveManagerMatch } from "@/components/live-manager-match";
import { PlayerCareerMatch } from "@/components/player-career-match";

export default async function CareerMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) redirect("/login");
  const { id } = await params; const match = await getCareerMatch(id, user.id); if (!match) notFound();
  const playerMode = match.mode === "player";
  return <div className="mx-auto grid max-w-2xl gap-6"><div><h1 className="text-3xl font-bold">{playerMode ? "Spillerkarriere" : "Managerkamp"}</h1><p className="text-muted">{playerMode ? "Velg riktig understat og vinn flest runder." : "Begge ser samme kampklokke. En omgang varer ett minutt."}</p></div>{playerMode ? <PlayerCareerMatch match={match} userId={user.id}/> : <LiveManagerMatch match={match} userId={user.id}/>}</div>;
}
