import Link from "next/link";
import { clubLevelProgress, describeLevelReward } from "@/lib/club-level";

// Seksjonene som finnes under /managerkarriere/[section]. Fanelinjen nederst viser de viktigste;
// klubblager, kamplobby og historikk nås fra Tropp- og Sesong-sidene.
export const managerSections = [
  { key: "sesong", title: "Sesong" },
  { key: "lagtropp", title: "Tropp" },
  { key: "klubblager", title: "Klubblager" },
  { key: "pakker", title: "Pakker" },
  { key: "spillermarked", title: "Marked" },
  { key: "kamplobby", title: "Vennskapskamp" },
  { key: "karrierehistorikk", title: "Kamphistorikk" },
] as const;

export type ManagerSectionKey = typeof managerSections[number]["key"];

type ManagerStatus = { clubName: string; budget: number; rating: number | null; clubXp: number; title?: string };

/** Klubbstatusen øverst på alle managersider. Navigasjonen ligger i fanelinjen nederst. */
export function ManagerTopBar({ clubName, budget, rating, clubXp, title }: ManagerStatus) {
  const progress = clubLevelProgress(clubXp);
  return <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#08101b] px-4 py-4 shadow-xl sm:px-6" style={{ backgroundImage: "radial-gradient(circle at 12% 0%, rgba(24,207,255,.18), transparent 25%), radial-gradient(circle at 90% 100%, rgba(152,255,44,.14), transparent 30%)" }}>
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
      <div className="min-w-0">
        <div className="flex items-center gap-3"><Link href="/meny" className="text-[10px] font-black tracking-[.2em] text-white/45 hover:text-white">← MENY</Link><p className="text-[10px] font-black tracking-[.28em] text-cyan-300">{title ? title.toUpperCase() : "MANAGERKARRIERE"}</p></div>
        <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">{clubName}</h1>
      </div>
      <div className="flex gap-5 sm:ml-auto">
        <div title={`Nivå ${progress.level + 1} gir ${describeLevelReward(progress.nextReward)}`}><p className="text-[10px] font-bold tracking-widest text-white/45">KLUBBNIVÅ</p><p className="mt-1 text-lg font-black text-white">{progress.level}</p><div className="mt-1 h-1 w-14 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime-300" style={{ width: `${Math.round((progress.into / progress.needed) * 100)}%` }} /></div></div>
        <div className="border-l border-white/15 pl-5"><p className="text-[10px] font-bold tracking-widest text-white/45">BUDSJETT</p><p className="mt-1 text-lg font-black text-cyan-300">{budget} MB</p></div>
        <div className="border-l border-white/15 pl-5"><p className="text-[10px] font-bold tracking-widest text-white/45">RATING</p><p className="mt-1 text-lg font-black text-lime-300">{rating ?? "—"}</p></div>
      </div>
    </div>
  </section>;
}

/** Undermeny for sider med to visninger, som Tropp/Klubblager og Katalog/Overgangsmarked. */
export function SubTabs({ tabs }: { tabs: { href: string; label: string; active: boolean }[] }) {
  return <div className="flex gap-1 rounded-xl bg-white/5 p-1">{tabs.map((tab) => <Link key={tab.label} href={tab.href} aria-current={tab.active ? "page" : undefined} className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-black transition ${tab.active ? "bg-lime-300 text-slate-950" : "text-white/60 hover:text-white"}`}>{tab.label}</Link>)}</div>;
}
