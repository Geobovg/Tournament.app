import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CareerChallengePanel } from "@/components/career-dashboard";
import { ChallengeLobby } from "@/components/challenge-lobby";
import { FriendMarket } from "@/components/friend-market";
import { ManagerCareer } from "@/components/manager-career";
import { ManagerMatchHistory } from "@/components/manager-match-history";
import { ManagerTopBar, managerSections, type ManagerSectionKey } from "@/components/manager-navigation";
import { secondaryButtonClass } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getCareerChallenges, getCareerProfile, getManagerCareer, listDirectTransferOffers, listFriendMarket, listManagerMatchHistory } from "@/lib/career";
import { listFriends } from "@/lib/friends";
import { formationNames, pickBestLineup, type Formation } from "@/lib/lineup";

export const dynamic = "force-dynamic";

const validSections = new Set(managerSections.map((section) => section.key));

export default async function ManagerCareerSectionPage({ params, searchParams }: PageProps<"/managerkarriere/[section]">) {
  const { section } = await params; const { tab } = await searchParams;
  if (!validSections.has(section as ManagerSectionKey)) notFound();
  const user = await currentUser();
  if (!user) redirect("/login");
  const [career, manager] = await Promise.all([getCareerProfile(user.id), getManagerCareer(user.id)]);
  const formation = formationNames.includes(manager.lineup?.formation as Formation) ? manager.lineup!.formation as Formation : "4-3-3";
  const starterIds = manager.lineup?.starters.length === 11 ? manager.lineup.starters : pickBestLineup(manager.cards.filter((card) => card.location === "squad"), formation).starters;
  const starterCards = starterIds.map((id) => manager.cards.find((card) => card.id === id)).filter(Boolean);
  const rating = starterCards.length === 11 ? Math.round(starterCards.reduce((sum, card) => sum + card!.overall, 0) / 11) : null;
  const active = section as ManagerSectionKey;
  let content: React.ReactNode;
  if (active === "lagtropp") content = <ManagerCareer {...manager} budget={career.manager_budget} section="squad" />;
  else if (active === "klubblager") content = <ManagerCareer {...manager} budget={career.manager_budget} section="storage" />;
  else if (active === "pakker") content = <ManagerCareer {...manager} budget={career.manager_budget} section="packs" />;
  else if (active === "karrierehistorikk") {
    const history = await listManagerMatchHistory(user.id);
    content = <ManagerMatchHistory matches={history} />;
  } else if (active === "kamplobby") {
    const [friends, challenges] = await Promise.all([listFriends(user.id), getCareerChallenges(user.id)]);
    content = <div className="grid gap-6"><ChallengeLobby challenges={challenges} userId={user.id} /><CareerChallengePanel friends={friends} /></div>;
  } else {
    const [friends, listings, offers] = await Promise.all([listFriends(user.id), listFriendMarket(user.id), listDirectTransferOffers(user.id)]);
    const friendTab = tab === "venner";
    content = <div className="grid gap-5"><div className="flex gap-2 border-b border-white/10"><Link href="/managerkarriere/spillermarked" className={`${secondaryButtonClass} ${!friendTab ? "border-cyan-300 text-cyan-300" : ""}`}>Spillerkatalog</Link><Link href="/managerkarriere/spillermarked?tab=venner" className={`${secondaryButtonClass} ${friendTab ? "border-cyan-300 text-cyan-300" : ""}`}>Vennemarked</Link></div>{friendTab ? <FriendMarket cards={manager.cards} listings={listings} offers={offers} friends={friends} userId={user.id} budget={career.manager_budget} /> : <ManagerCareer {...manager} budget={career.manager_budget} section="catalog" />}</div>;
  }
  return <div className="mx-auto grid w-full max-w-[1600px] gap-6"><ManagerTopBar clubName={career.club_name} budget={career.manager_budget} rating={rating} active={active} /><div className="flex items-center gap-3"><Link href="/managerkarriere" className={secondaryButtonClass}>← Managerkarriere</Link><p className="text-sm text-white/50">{managerSections.find((item) => item.key === active)?.title}</p></div>{content}</div>;
}
