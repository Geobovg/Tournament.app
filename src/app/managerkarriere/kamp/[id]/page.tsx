import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getCareerMatch } from "@/lib/career";
import { LiveManagerMatch } from "@/components/live-manager-match";

export default async function CareerMatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ historikk?: string }> }) {
  const user = await currentUser(); if (!user) redirect("/login");
  const { id } = await params; const { historikk } = await searchParams; const match = await getCareerMatch(id, user.id); if (!match) notFound();
  return <div className="mx-auto grid max-w-2xl gap-6"><div><h1 className="text-3xl font-bold">{`${match.home.username} mot ${match.away.username}`}</h1><p className="text-muted">{historikk === "1" ? "Se den lagrede oppsummeringen av managerkampen." : "Begge ser samme kampklokke. En omgang varer ett minutt, med kort pause."}</p></div><LiveManagerMatch match={match} userId={user.id} returnAfterComplete={historikk !== "1"}/></div>;
}
