import Link from "next/link";
import { cardClass, secondaryButtonClass } from "./ui";
import type { ManagerMatchHistory } from "@/lib/career";
import { INTL_LOCALES } from "@/i18n/locales";
import { getLocale, getT } from "@/i18n/server";

const resultStyles = { win: "text-success", draw: "text-accent", loss: "text-danger" };

export async function ManagerMatchHistory({ matches }: { matches: ManagerMatchHistory[] }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const copy = t.match.history;
  return <section className={`${cardClass} grid gap-4`}><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-muted">{copy.eyebrow}</p><h2 className="mt-1 text-2xl font-bold">{copy.title}</h2><p className="mt-1 text-sm text-muted">{copy.intro}</p></div></div>{matches.length ? <div className="grid gap-2">{matches.map((match) => <div key={match.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-raised p-3"><div className="min-w-28"><p className={`text-sm font-bold ${resultStyles[match.result]}`}>{copy.results[match.result]}</p><p className="text-xs text-muted">{copy.against(match.opponentName)}</p></div><p className="text-2xl font-black tabular-nums">{match.myScore} <span className="text-muted">–</span> {match.opponentScore}</p><div className="ml-auto text-right"><p className="text-sm font-bold text-accent">{match.managerBudget ? `+${match.managerBudget} MB` : "0 MB"}</p><p className="text-xs text-muted">{match.completedAt ? new Intl.DateTimeFormat(INTL_LOCALES[locale], { day: "numeric", month: "short" }).format(new Date(match.completedAt)) : copy.finished}</p></div><Link href={`/managerkarriere/kamp/${match.id}?historikk=1`} className={secondaryButtonClass}>{copy.details}</Link></div>)}</div> : <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">{copy.empty}</div>}</section>;
}
