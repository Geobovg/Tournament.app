import Link from "next/link";
import { redirect } from "next/navigation";
import { ManagerTopBar } from "@/components/manager-navigation";
import { ManagerOverview } from "@/components/manager-overview";
import { AiSeasonHero, FriendSeasonTeaser } from "@/components/season-panels";
import { currentUser } from "@/lib/auth";
import { getCareerChallenges, getCareerProfile, getManagerCareer, listManagerMatchHistory } from "@/lib/career";
import { formationNames, pickBestLineup, type Formation } from "@/lib/lineup";
import { getAiSeason, getFriendSeasons } from "@/lib/seasons";

export const dynamic = "force-dynamic";

export default async function ManagerCareerPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const [career, manager, challenges, matches, friendSeasons] = await Promise.all([getCareerProfile(user.id), getManagerCareer(user.id), getCareerChallenges(user.id), listManagerMatchHistory(user.id), getFriendSeasons(user.id)]);
  const season = await getAiSeason(user.id, career.club_name);
  const formation = formationNames.includes(manager.lineup?.formation as Formation) ? manager.lineup!.formation as Formation : "4-3-3";
  const starters = manager.lineup?.starters.length === 11 ? manager.lineup.starters : pickBestLineup(manager.cards.filter((card) => card.location === "squad"), formation).starters;
  const selected = starters.map((id) => manager.cards.find((card) => card.id === id)).filter(Boolean);
  const rating = selected.length === 11 ? Math.round(selected.reduce((sum, card) => sum + card!.overall, 0) / 11) : null;
  const squadCount = manager.cards.filter((card) => card.location === "squad").length;
  return <div className="mx-auto grid w-full max-w-[1600px] gap-4">
    <ManagerTopBar clubName={career.club_name} budget={career.manager_budget} rating={rating} clubXp={career.club_xp} />
    <AiSeasonHero season={season} />
    <FriendSeasonTeaser seasons={friendSeasons} />
    <Link href="/managerkarriere/lagtropp" className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/75 p-4 transition hover:border-lime-300/50">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-lg text-lime-300">◈</span>
      <div className="min-w-0 flex-1"><p className="text-xs font-black tracking-widest text-white/45">TROPPEN DIN</p><p className="truncate font-black">{formation} · rating {rating ?? "—"} · {squadCount} / 23 kort</p></div>
      <span className="shrink-0 text-sm font-black text-lime-300">Endre →</span>
    </Link>
    <ManagerOverview userId={user.id} challenges={challenges} matches={matches} packs={manager.packs} freePacks={manager.freePacks} budget={career.manager_budget} record={{ wins: career.manager_career_wins, draws: career.manager_career_draws, losses: career.manager_career_losses }} />
  </div>;
}
