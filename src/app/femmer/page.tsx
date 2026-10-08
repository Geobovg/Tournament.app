import Link from "next/link";
import { redirect } from "next/navigation";
import { FiveCollection } from "@/components/femmer/five-collection";
import { FiveHistory } from "@/components/femmer/five-history";
import { FiveLeaderboard } from "@/components/femmer/five-leaderboard";
import { FiveLoginBonus, FiveObjectives } from "@/components/femmer/five-objectives";
import { FivePacks } from "@/components/femmer/five-packs";
import { FivePlay } from "@/components/femmer/five-play";
import { FiveSeasons } from "@/components/femmer/five-seasons";
import { FiveSquad } from "@/components/femmer/five-squad";
import { FiveStart } from "@/components/femmer/five-start";
import { ModeMenuLink } from "@/components/mode-menu";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { listFriends } from "@/lib/friends";
import { getFiveLeaderboard, getFiveState, getLiveFiveMatchId, listFiveInforms, listFiveMatches, listFiveOpponents, listFivePeople } from "@/lib/femmer/data";
import { settleStaleMatch } from "@/lib/femmer/live";
import { getFiveObjectives } from "@/lib/femmer/objectives";
import { listFiveSeasons } from "@/lib/femmer/seasons";

export const dynamic = "force-dynamic";

const tabKeys = ["lag", "kamp", "sesong", "pakker", "utfordringer", "kort", "toppliste", "historikk"] as const;
type TabKey = (typeof tabKeys)[number];

export default async function FemmerPage({ searchParams }: PageProps<"/femmer">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = tabKeys.includes(rawTab as TabKey) ? (rawTab as TabKey) : "lag";
  const t = (await getT()).femmer;
  // En kamp som ble forlatt før den var ferdig, gjøres opp før resten hentes, så myntene og tabellen stemmer.
  await settleStaleMatch(user.id);
  const [people, state, liveMatchId] = await Promise.all([listFivePeople(), getFiveState(user.id), getLiveFiveMatchId(user.id)]);

  const heading = <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[.25em] text-fuchsia-300">{t.menu.kicker}</p><h1 className="text-3xl font-black">{t.title}</h1><p className="mt-1 max-w-2xl text-muted">{t.intro}</p></div><ModeMenuLink /></div>;

  if (!state) {
    const own = people.some((person) => person.personId === user.id) ? user.id : null;
    return <div className="mx-auto grid w-full max-w-6xl gap-5">{heading}<FiveStart people={people} ownPersonId={own} /></div>;
  }

  const { profile } = state;
  let content: React.ReactNode;
  if (tab === "kamp") content = <FivePlay aiLevel={profile.aiLevel} bestAiLevel={profile.bestAiLevel} opponents={await listFiveOpponents(user.id)} ready={state.starters.length === 5} liveMatchId={liveMatchId} />;
  else if (tab === "sesong") {
    const [seasons, friends] = await Promise.all([listFiveSeasons(user.id), listFriends(user.id)]);
    content = <FiveSeasons seasons={seasons} friends={friends.map((friend) => ({ id: friend.id, username: friend.username }))} userId={user.id} />;
  } else if (tab === "pakker") content = <FivePacks coins={profile.coins} people={people} />;
  else if (tab === "utfordringer") content = <div className="grid gap-4"><FiveLoginBonus streak={profile.loginStreak} claimedToday={profile.loginClaimedToday} people={people} coins={profile.coins} /><FiveObjectives objectives={await getFiveObjectives(user.id)} people={people} coins={profile.coins} /></div>;
  else if (tab === "kort") content = <FiveCollection cards={state.cards} people={people} informs={await listFiveInforms()} coins={profile.coins} />;
  else if (tab === "toppliste") content = <FiveLeaderboard board={await getFiveLeaderboard()} userId={user.id} />;
  else if (tab === "historikk") content = <FiveHistory matches={await listFiveMatches(user.id)} userId={user.id} />;
  else content = <FiveSquad key={[...state.starters, "|", ...state.bench].join()} cards={state.cards} starters={state.starters} bench={state.bench} formation={profile.formation} coins={profile.coins} />;

  const stats = [
    { label: t.coins, value: String(profile.coins) },
    { label: t.teamRating, value: String(state.rating ?? "—") },
    { label: t.aiLevel, value: String(profile.aiLevel) },
    { label: t.record, value: t.recordValue(profile.wins, profile.draws, profile.losses) },
  ];
  const dots: Partial<Record<TabKey, boolean>> = { utfordringer: !profile.loginClaimedToday, kamp: Boolean(liveMatchId) };

  return <div className="mx-auto grid w-full max-w-6xl gap-5">
    {heading}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-xl border border-white/10 bg-slate-900/75 p-3"><p className="text-[11px] font-black tracking-widest text-white/45">{stat.label}</p><p className="truncate text-xl font-black">{stat.value}</p></div>)}</div>
    {liveMatchId && tab !== "kamp" ? <Link href={`/femmer/kamp/${liveMatchId}`} className="rounded-xl border border-amber-300/50 bg-amber-300/15 p-3 text-sm font-black text-amber-200">{t.play.resume}</Link> : null}
    {!profile.loginClaimedToday && tab !== "utfordringer" ? <Link href="/femmer?tab=utfordringer" className="rounded-xl border border-lime-300/40 bg-lime-300/10 p-3 text-sm font-black text-lime-200">{t.login.banner}</Link> : null}
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 p-1">{tabKeys.map((key) => <Link key={key} href={key === "lag" ? "/femmer" : `/femmer?tab=${key}`} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-black transition ${key === tab ? "bg-white text-slate-950" : "text-white/70 hover:bg-white/10"}`}>{t.tabs[key]}{dots[key] ? " •" : ""}</Link>)}</nav>
    {content}
  </div>;
}
