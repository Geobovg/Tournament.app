import Link from "next/link";
import { redirect } from "next/navigation";
import { FiveCollection } from "@/components/femmer/five-collection";
import { FiveHistory } from "@/components/femmer/five-history";
import { FivePacks } from "@/components/femmer/five-packs";
import { FivePlay } from "@/components/femmer/five-play";
import { FiveSquad } from "@/components/femmer/five-squad";
import { FiveStart } from "@/components/femmer/five-start";
import { ModeMenuLink } from "@/components/mode-menu";
import { getT } from "@/i18n/server";
import { currentUser } from "@/lib/auth";
import { getFiveState, listFiveMatches, listFiveOpponents, listFivePeople } from "@/lib/femmer/data";

export const dynamic = "force-dynamic";

const tabKeys = ["lag", "kamp", "pakker", "kort", "historikk"] as const;
type TabKey = (typeof tabKeys)[number];

export default async function FemmerPage({ searchParams }: PageProps<"/femmer">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = tabKeys.includes(rawTab as TabKey) ? (rawTab as TabKey) : "lag";
  const t = (await getT()).femmer;
  const people = await listFivePeople();
  const [state, opponents, matches] = await Promise.all([
    getFiveState(user.id, people),
    tab === "kamp" ? listFiveOpponents(user.id) : [],
    tab === "historikk" ? listFiveMatches(user.id) : [],
  ]);

  const heading = <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black tracking-[.25em] text-fuchsia-300">{t.menu.kicker}</p><h1 className="text-3xl font-black">{t.title}</h1><p className="mt-1 max-w-2xl text-muted">{t.intro}</p></div><ModeMenuLink /></div>;

  if (!state) {
    const own = people.some((person) => person.personId === user.id) ? user.id : null;
    return <div className="mx-auto grid w-full max-w-6xl gap-5">{heading}<FiveStart people={people} ownPersonId={own} /></div>;
  }

  const { profile } = state;
  const stats = [
    { label: t.coins, value: String(profile.coins) },
    { label: t.teamRating, value: String(state.rating ?? "—") },
    { label: t.aiLevel, value: String(profile.aiLevel) },
    { label: t.record, value: t.recordValue(profile.wins, profile.draws, profile.losses) },
  ];

  let content: React.ReactNode;
  if (tab === "kamp") content = <FivePlay aiLevel={profile.aiLevel} bestAiLevel={profile.bestAiLevel} opponents={opponents} ready={state.starters.length === 5} />;
  else if (tab === "pakker") content = <FivePacks coins={profile.coins} freePackAvailable={profile.freePackAvailable} people={people} />;
  else if (tab === "kort") content = <FiveCollection cards={state.cards} people={people} />;
  else if (tab === "historikk") content = <FiveHistory matches={matches} userId={user.id} />;
  else content = <FiveSquad key={[...state.starters, "|", ...state.bench].join()} cards={state.cards} starters={state.starters} bench={state.bench} formation={profile.formation} />;

  return <div className="mx-auto grid w-full max-w-6xl gap-5">
    {heading}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-xl border border-white/10 bg-slate-900/75 p-3"><p className="text-[11px] font-black tracking-widest text-white/45">{stat.label}</p><p className="truncate text-xl font-black">{stat.value}</p></div>)}</div>
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 p-1">{tabKeys.map((key) => <Link key={key} href={key === "lag" ? "/femmer" : `/femmer?tab=${key}`} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-black transition ${key === tab ? "bg-white text-slate-950" : "text-white/70 hover:bg-white/10"}`}>{t.tabs[key]}{key === "pakker" && profile.freePackAvailable ? " •" : ""}</Link>)}</nav>
    {content}
  </div>;
}
