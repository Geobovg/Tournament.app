import { redirect } from "next/navigation";
import { CareerChallengePanel } from "@/components/career-dashboard";
import { ChallengeLobby } from "@/components/challenge-lobby";
import { FriendMarket } from "@/components/friend-market";
import { ManagerCareer } from "@/components/manager-career";
import { ModePageHeading } from "@/components/mode-menu";
import { cardClass } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getCareerChallenges, getCareerProfile, getManagerCareer, listDirectTransferOffers, listFriendMarket } from "@/lib/career";
import { listFriends } from "@/lib/friends";

export const dynamic = "force-dynamic";

export default async function ManagerCareerPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const [career, friends, manager, listings, challenges, offers] = await Promise.all([getCareerProfile(user.id), listFriends(user.id), getManagerCareer(user.id), listFriendMarket(user.id), getCareerChallenges(user.id), listDirectTransferOffers(user.id)]);
  return <div className="mx-auto grid max-w-4xl gap-6"><ModePageHeading title="Manager Karriere" description="Bygg laget ditt, velg elleveren og ta taktiske valg mot vennene dine."/><section className={`${cardClass} flex flex-wrap items-center justify-between gap-3`}><div><p className="text-sm font-semibold text-muted">MANAGERBUDSJETT</p><h2 className="mt-1 text-2xl font-bold">{career.club_name}</h2><p className="mt-1 text-sm text-muted">Vinn managerkamper for å kjøpe nye kort.</p></div><div className="rounded-xl bg-accent-soft px-5 py-4 text-right"><b className="text-3xl text-accent">{career.manager_budget} MB</b><p className="text-xs text-muted">Tjent: {career.manager_budget_earned}</p></div></section><ChallengeLobby challenges={challenges} userId={user.id} mode="manager"/><CareerChallengePanel friends={friends} mode="manager"/><ManagerCareer {...manager} budget={career.manager_budget}/><FriendMarket cards={manager.cards} listings={listings} offers={offers} friends={friends} userId={user.id} budget={career.manager_budget}/></div>;
}
