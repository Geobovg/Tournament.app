import { notFound, redirect } from "next/navigation";
import { CareerChallengePanel } from "@/components/career-dashboard";
import { ChallengeLobby } from "@/components/challenge-lobby";
import { ManagerCareer } from "@/components/manager-career";
import { ManagerMatchHistory } from "@/components/manager-match-history";
import { ManagerTopBar, managerSections, SubTabs, type ManagerSectionKey } from "@/components/manager-navigation";
import { AiSeasonDetails, FriendSeasonsPanel } from "@/components/season-panels";
import { TransferMarket } from "@/components/transfer-market";
import { currentUser } from "@/lib/auth";
import { getCareerChallenges, getCareerProfile, getManagerCareer, listManagerMatchHistory, listTransferMarket } from "@/lib/career";
import { listFriends } from "@/lib/friends";
import { formationNames, pickBestLineup, type Formation } from "@/lib/lineup";
import { getAiSeason, getFriendSeasons } from "@/lib/seasons";

export const dynamic = "force-dynamic";

const validSections = new Set<string>(managerSections.map((section) => section.key));

export default async function ManagerCareerSectionPage({ params, searchParams }: PageProps<"/managerkarriere/[section]">) {
  const { section } = await params; const { tab } = await searchParams;
  if (!validSections.has(section)) notFound();
  const user = await currentUser();
  if (!user) redirect("/login");
  const [career, manager] = await Promise.all([getCareerProfile(user.id), getManagerCareer(user.id)]);
  const formation = formationNames.includes(manager.lineup?.formation as Formation) ? manager.lineup!.formation as Formation : "4-3-3";
  const starterIds = manager.lineup?.starters.length === 11 ? manager.lineup.starters : pickBestLineup(manager.cards.filter((card) => card.location === "squad"), formation).starters;
  const starterCards = starterIds.map((id) => manager.cards.find((card) => card.id === id)).filter(Boolean);
  const rating = starterCards.length === 11 ? Math.round(starterCards.reduce((sum, card) => sum + card!.overall, 0) / 11) : null;
  const active = section as ManagerSectionKey;
  const squadTabs = <SubTabs tabs={[{ href: "/managerkarriere/lagtropp", label: "Lagtropp", active: active === "lagtropp" }, { href: "/managerkarriere/klubblager", label: "Klubblager", active: active === "klubblager" }]} />;
  const seasonTabs = (current: string) => <SubTabs tabs={[{ href: "/managerkarriere/sesong", label: "AI-sesong", active: current === "ai" }, { href: "/managerkarriere/sesong?tab=venner", label: "Venner", active: current === "venner" }, { href: "/managerkarriere/karrierehistorikk", label: "Historikk", active: current === "historikk" }]} />;

  let content: React.ReactNode;
  if (active === "lagtropp") content = <div className="grid gap-4">{squadTabs}<ManagerCareer {...manager} budget={career.manager_budget} section="squad" /></div>;
  else if (active === "klubblager") content = <div className="grid gap-4">{squadTabs}<ManagerCareer {...manager} budget={career.manager_budget} section="storage" /></div>;
  else if (active === "pakker") content = <ManagerCareer {...manager} budget={career.manager_budget} section="packs" />;
  else if (active === "sesong") {
    if (tab === "venner") {
      const [seasons, friends, challenges] = await Promise.all([getFriendSeasons(user.id), listFriends(user.id), getCareerChallenges(user.id)]);
      content = <div className="grid gap-4">{seasonTabs("venner")}<FriendSeasonsPanel seasons={seasons} friends={friends} /><div className="grid gap-4 lg:grid-cols-2"><ChallengeLobby challenges={challenges} userId={user.id} /><CareerChallengePanel friends={friends} /></div></div>;
    } else {
      const season = await getAiSeason(user.id, career.club_name);
      content = <div className="grid gap-4">{seasonTabs("ai")}<AiSeasonDetails season={season} /></div>;
    }
  } else if (active === "karrierehistorikk") {
    const history = await listManagerMatchHistory(user.id);
    content = <div className="grid gap-4">{seasonTabs("historikk")}<ManagerMatchHistory matches={history} /></div>;
  } else if (active === "kamplobby") {
    // Løse vennskapskamper bor nå under Sesong → Venner.
    redirect("/managerkarriere/sesong?tab=venner");
  } else {
    const marketTab = tab === "marked";
    const listings = marketTab ? await listTransferMarket() : [];
    content = <div className="grid gap-4"><SubTabs tabs={[{ href: "/managerkarriere/spillermarked", label: "Spillerkatalog", active: !marketTab }, { href: "/managerkarriere/spillermarked?tab=marked", label: "Overgangsmarked", active: marketTab }]} />{marketTab ? <TransferMarket cards={manager.cards} catalog={manager.catalog} listings={listings} userId={user.id} budget={career.manager_budget} /> : <ManagerCareer {...manager} budget={career.manager_budget} section="catalog" />}</div>;
  }
  return <div className="mx-auto grid w-full max-w-[1600px] gap-5"><ManagerTopBar clubName={career.club_name} budget={career.manager_budget} rating={rating} clubXp={career.club_xp} title={managerSections.find((item) => item.key === active)?.title} />{content}</div>;
}
