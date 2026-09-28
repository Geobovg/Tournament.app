import { notFound, redirect } from "next/navigation";
import { CareerChallengePanel } from "@/components/career-dashboard";
import { ChallengeLobby } from "@/components/challenge-lobby";
import { ManagerCareer } from "@/components/manager-career";
import { ManagerMatchHistory } from "@/components/manager-match-history";
import { ManagerTopBar, managerSections, SubTabs, type ManagerSectionKey } from "@/components/manager-navigation";
import { AiSeasonDetails, FriendSeasonsPanel } from "@/components/season-panels";
import { TransferMarket } from "@/components/transfer-market";
import { currentUser, sessionUserId } from "@/lib/auth";
import { getCareerChallenges, getCareerProfile, getCatalogPage, getManagerCareer, getManagerRating, listManagerMatchHistory, listTransferMarket, ratingFromSquad } from "@/lib/career";
import { defaultCatalogFilters } from "@/lib/catalog-filters";
import { listFriends } from "@/lib/friends";
import { getAiSeason, getFriendSeasons } from "@/lib/seasons";

export const dynamic = "force-dynamic";

const validSections = new Set<string>(managerSections.map((section) => section.key));
// Bare disse seksjonene viser spillerkort.
const needsCards = new Set<string>(["lagtropp", "klubblager", "pakker", "spillermarked"]);

export default async function ManagerCareerSectionPage({ params, searchParams }: PageProps<"/managerkarriere/[section]">) {
  const { section } = await params; const { tab } = await searchParams;
  if (!validSections.has(section)) notFound();
  // Løse vennskapskamper bor nå under Sesong → Venner.
  if (section === "kamplobby") redirect("/managerkarriere/sesong?tab=venner");
  // Id-en kommer fra den signerte cookien, så alt under kan hentes samtidig i stedet for etter hverandre.
  const userId = await sessionUserId();
  if (!userId) redirect("/login");
  const active = section as ManagerSectionKey;
  const marketTab = active === "spillermarked" && tab === "marked";
  const careerPromise = getCareerProfile(userId);
  const [user, career, manager, ratingInfo, catalogPage, listings, friendsData, season, history] = await Promise.all([
    currentUser(),
    careerPromise,
    needsCards.has(active) ? getManagerCareer(userId) : null,
    getManagerRating(userId),
    active === "spillermarked" && !marketTab ? getCatalogPage(defaultCatalogFilters) : undefined,
    marketTab ? listTransferMarket() : [],
    active === "sesong" && tab === "venner" ? Promise.all([getFriendSeasons(userId), listFriends(userId), getCareerChallenges(userId)]) : null,
    active === "sesong" && tab !== "venner" ? getAiSeason(userId, careerPromise.then((profile) => profile.club_name)) : null,
    active === "karrierehistorikk" ? listManagerMatchHistory(userId) : null,
  ]);
  if (!user) redirect("/login");
  const { rating } = ratingFromSquad(ratingInfo);
  const squadTabs = <SubTabs tabs={[{ href: "/managerkarriere/lagtropp", label: "Lagtropp", active: active === "lagtropp" }, { href: "/managerkarriere/klubblager", label: "Klubblager", active: active === "klubblager" }]} />;
  const seasonTabs = (current: string) => <SubTabs tabs={[{ href: "/managerkarriere/sesong", label: "AI-sesong", active: current === "ai" }, { href: "/managerkarriere/sesong?tab=venner", label: "Venner", active: current === "venner" }, { href: "/managerkarriere/karrierehistorikk", label: "Historikk", active: current === "historikk" }]} />;

  let content: React.ReactNode;
  if (active === "lagtropp") content = <div className="grid gap-4">{squadTabs}<ManagerCareer {...manager!} budget={career.manager_budget} section="squad" /></div>;
  else if (active === "klubblager") content = <div className="grid gap-4">{squadTabs}<ManagerCareer {...manager!} budget={career.manager_budget} section="storage" /></div>;
  else if (active === "pakker") content = <ManagerCareer {...manager!} budget={career.manager_budget} section="packs" />;
  else if (active === "sesong") {
    if (friendsData) {
      const [seasons, friends, challenges] = friendsData;
      content = <div className="grid gap-4">{seasonTabs("venner")}<FriendSeasonsPanel seasons={seasons} friends={friends} /><div className="grid gap-4 lg:grid-cols-2"><ChallengeLobby challenges={challenges} userId={userId} /><CareerChallengePanel friends={friends} /></div></div>;
    } else content = <div className="grid gap-4">{seasonTabs("ai")}<AiSeasonDetails season={season!} /></div>;
  } else if (active === "karrierehistorikk") {
    content = <div className="grid gap-4">{seasonTabs("historikk")}<ManagerMatchHistory matches={history!} /></div>;
  } else {
    content = <div className="grid gap-4"><SubTabs tabs={[{ href: "/managerkarriere/spillermarked", label: "Spillerkatalog", active: !marketTab }, { href: "/managerkarriere/spillermarked?tab=marked", label: "Overgangsmarked", active: marketTab }]} />{marketTab ? <TransferMarket cards={manager!.cards} listings={listings} userId={userId} budget={career.manager_budget} /> : <ManagerCareer {...manager!} catalogPage={catalogPage} budget={career.manager_budget} section="catalog" />}</div>;
  }
  return <div className="mx-auto grid w-full max-w-[1600px] gap-5"><ManagerTopBar clubName={career.club_name} budget={career.manager_budget} rating={rating} clubXp={career.club_xp} title={managerSections.find((item) => item.key === active)?.title} />{content}</div>;
}
