import { notFound, redirect } from "next/navigation";
import { CareerChallengePanel } from "@/components/career-dashboard";
import { ChallengeLobby } from "@/components/challenge-lobby";
import { InformGallery } from "@/components/inform-gallery";
import { ManagerCareer } from "@/components/manager-career";
import { ManagerMatchHistory } from "@/components/manager-match-history";
import { ManagerTopBar, managerSections, SubTabs, type ManagerSectionKey } from "@/components/manager-navigation";
import { AiSeasonDetails, FriendSeasonsPanel } from "@/components/season-panels";
import { SbcPanel } from "@/components/sbc-panel";
import { MarketChat } from "@/components/market-chat";
import { TransferMarket } from "@/components/transfer-market";
import { currentUser, sessionUserId } from "@/lib/auth";
import { getCareerChallenges, getCareerProfile, getCatalogPage, getInformHistory, getManagerCareer, getManagerRating, getPackShop, listManagerMatchHistory, listTransferMarket, ratingFromSquad } from "@/lib/career";
import { defaultCatalogFilters } from "@/lib/catalog-filters";
import { listFriends } from "@/lib/friends";
import { getMarketChatUnread, listMarketChat } from "@/lib/market-chat";
import { getSbcData } from "@/lib/sbc-data";
import { getAiSeason, getFriendSeasons } from "@/lib/seasons";
import { getT } from "@/i18n/server";

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
  const [user, career, manager, ratingInfo, catalogPage, listings, chat, friendsData, season, history, sbcData, shop, informRounds] = await Promise.all([
    currentUser(),
    careerPromise,
    needsCards.has(active) ? getManagerCareer(userId) : null,
    getManagerRating(userId),
    active === "spillermarked" && !marketTab ? getCatalogPage(defaultCatalogFilters) : undefined,
    marketTab ? listTransferMarket() : [],
    // Lest-status settes først når chatten faktisk vises i nettleseren, ikke ved sidevisning.
    marketTab ? Promise.all([listMarketChat(userId, false), getMarketChatUnread(userId)]) : null,
    active === "sesong" && tab === "venner" ? Promise.all([getFriendSeasons(userId), listFriends(userId), getCareerChallenges(userId)]) : null,
    active === "sesong" && tab !== "venner" ? getAiSeason(userId, careerPromise.then((profile) => profile.club_name)) : null,
    active === "karrierehistorikk" ? listManagerMatchHistory(userId) : null,
    active === "sbc" ? getSbcData(userId) : null,
    active === "pakker" ? getPackShop(userId) : null,
    active === "informs" ? getInformHistory() : null,
  ]);
  if (!user) redirect("/login");
  const t = await getT(); const tabs = t.career.subTabs;
  const { rating } = ratingFromSquad(ratingInfo);
  const squadTabs = <SubTabs tabs={[{ href: "/managerkarriere/lagtropp", label: tabs.squad, active: active === "lagtropp" }, { href: "/managerkarriere/klubblager", label: tabs.storage, active: active === "klubblager" }]} />;
  const seasonTabs = (current: string) => <SubTabs tabs={[{ href: "/managerkarriere/sesong", label: tabs.aiSeason, active: current === "ai" }, { href: "/managerkarriere/sesong?tab=venner", label: tabs.friends, active: current === "venner" }, { href: "/managerkarriere/karrierehistorikk", label: tabs.history, active: current === "historikk" }]} />;

  let content: React.ReactNode;
  if (active === "lagtropp") content = <div className="grid gap-4">{squadTabs}<ManagerCareer {...manager!} budget={career.manager_budget} section="squad" /></div>;
  else if (active === "klubblager") content = <div className="grid gap-4">{squadTabs}<ManagerCareer {...manager!} budget={career.manager_budget} section="storage" /></div>;
  else if (active === "sbc") content = <SbcPanel {...sbcData!} />;
  else if (active === "informs") content = <InformGallery rounds={informRounds!} />;
  else if (active === "pakker") content = <ManagerCareer {...manager!} budget={career.manager_budget} section="packs" shop={shop!} />;
  else if (active === "sesong") {
    if (friendsData) {
      const [seasons, friends, challenges] = friendsData;
      content = <div className="grid gap-4">{seasonTabs("venner")}<FriendSeasonsPanel seasons={seasons} friends={friends} /><div className="grid gap-4 lg:grid-cols-2"><ChallengeLobby challenges={challenges} userId={userId} /><CareerChallengePanel friends={friends} /></div></div>;
    } else content = <div className="grid gap-4">{seasonTabs("ai")}<AiSeasonDetails season={season!} /></div>;
  } else if (active === "karrierehistorikk") {
    content = <div className="grid gap-4">{seasonTabs("historikk")}<ManagerMatchHistory matches={history!} /></div>;
  } else {
    content = <div className="grid gap-4"><SubTabs tabs={[{ href: "/managerkarriere/spillermarked", label: tabs.catalog, active: !marketTab }, { href: "/managerkarriere/spillermarked?tab=marked", label: tabs.transferMarket, active: marketTab }]} />{marketTab ? <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"><TransferMarket cards={manager!.cards} listings={listings} userId={userId} budget={career.manager_budget} /><MarketChat userId={userId} initialMessages={chat![0]} initialUnread={chat![1]} /></div> : <ManagerCareer {...manager!} catalogPage={catalogPage} budget={career.manager_budget} section="catalog" />}</div>;
  }
  return <div className="mx-auto grid w-full max-w-[1600px] gap-5"><ManagerTopBar clubName={career.club_name} budget={career.manager_budget} rating={rating} clubXp={career.club_xp} title={t.career.sections[active]} />{content}</div>;
}
