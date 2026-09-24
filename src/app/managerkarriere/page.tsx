import Link from "next/link";
import { redirect } from "next/navigation";
import { ManagerMenu } from "@/components/manager-navigation";
import { ManagerOverview } from "@/components/manager-overview";
import { secondaryButtonClass } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getCareerChallenges, getCareerProfile, getManagerCareer, listDirectTransferOffers, listManagerMatchHistory } from "@/lib/career";
import { formationNames, pickBestLineup, type Formation } from "@/lib/lineup";

export const dynamic = "force-dynamic";

export default async function ManagerCareerPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const [career, manager, challenges, offers, matches] = await Promise.all([getCareerProfile(user.id), getManagerCareer(user.id), getCareerChallenges(user.id), listDirectTransferOffers(user.id), listManagerMatchHistory(user.id)]);
  const formation = formationNames.includes(manager.lineup?.formation as Formation) ? manager.lineup!.formation as Formation : "4-3-3";
  const starters = manager.lineup?.starters.length === 11 ? manager.lineup.starters : pickBestLineup(manager.cards.filter((card) => card.location === "squad"), formation).starters;
  const selected = starters.map((id) => manager.cards.find((card) => card.id === id)).filter(Boolean);
  const rating = selected.length === 11 ? Math.round(selected.reduce((sum, card) => sum + card!.overall, 0) / 11) : null;
  return <div className="mx-auto grid w-full max-w-[1600px] gap-4"><div className="flex justify-end"><Link href="/meny" className={secondaryButtonClass}>← Hovedmeny</Link></div><ManagerMenu clubName={career.club_name} budget={career.manager_budget} rating={rating} squadCount={manager.cards.filter((card) => card.location === "squad").length} formation={formation} overview={<ManagerOverview userId={user.id} challenges={challenges} offers={offers} matches={matches} packs={manager.packs} budget={career.manager_budget} record={{ wins: career.manager_career_wins, draws: career.manager_career_draws, losses: career.manager_career_losses }} />} /></div>;
}
