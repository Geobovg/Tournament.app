import Link from "next/link";
import { getT } from "@/i18n/server";
import type { FiveMatchRow } from "@/lib/femmer/data";

/** De siste kampene, sett fra brukerens side også når det var en venn som startet kampen. */
export async function FiveHistory({ matches, userId }: { matches: FiveMatchRow[]; userId: string }) {
  const t = (await getT()).femmer;
  if (!matches.length) return <p className="text-muted">{t.history.empty}</p>;
  return <ul className="grid gap-2">
    {matches.map((match) => {
      const home = match.homeUserId === userId;
      const mine = home ? match.homeScore : match.awayScore;
      const theirs = home ? match.awayScore : match.homeScore;
      const result = mine > theirs ? "win" : mine === theirs ? "draw" : "loss";
      const opponent = home ? match.awayName : match.homeName;
      return <li key={match.id}><Link href={`/femmer/kamp/${match.id}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-3 transition hover:border-lime-300/50">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-black ${result === "win" ? "bg-lime-400 text-slate-950" : result === "draw" ? "bg-white/20" : "bg-red-500/80"}`}>{t.history.result[result]}</span>
        <div className="min-w-0 flex-1"><p className="truncate font-black">{opponent}</p><p className="text-xs text-muted">{match.kind === "ai" ? t.history.ai(match.aiLevel ?? 1) : match.kind === "season" ? t.history.season : t.history.friend}</p></div>
        <span className="text-xl font-black tabular-nums">{mine}–{theirs}</span>
      </Link></li>;
    })}
  </ul>;
}
