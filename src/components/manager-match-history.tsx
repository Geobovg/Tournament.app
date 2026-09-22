import Link from "next/link";
import { cardClass, secondaryButtonClass } from "./ui";
import type { ManagerMatchHistory } from "@/lib/career";

const labels = { win: "Seier", draw: "Uavgjort", loss: "Tap" };
const resultStyles = { win: "text-success", draw: "text-accent", loss: "text-danger" };

export function ManagerMatchHistory({ matches }: { matches: ManagerMatchHistory[] }) {
  return <section className={`${cardClass} grid gap-4`}><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-muted">KARRIEREHISTORIKK</p><h2 className="mt-1 text-2xl font-bold">Siste managerkamper</h2><p className="mt-1 text-sm text-muted">Resultater, belønninger og kampoppsummeringer blir værende her.</p></div></div>{matches.length ? <div className="grid gap-2">{matches.map((match) => <div key={match.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-raised p-3"><div className="min-w-28"><p className={`text-sm font-bold ${resultStyles[match.result]}`}>{labels[match.result]}</p><p className="text-xs text-muted">mot {match.opponentName}</p></div><p className="text-2xl font-black tabular-nums">{match.myScore} <span className="text-muted">–</span> {match.opponentScore}</p><div className="ml-auto text-right"><p className="text-sm font-bold text-accent">{match.managerBudget ? `+${match.managerBudget} MB` : "0 MB"}</p><p className="text-xs text-muted">{match.completedAt ? new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" }).format(new Date(match.completedAt)) : "Ferdig"}</p></div><Link href={`/karriere/kamp/${match.id}?historikk=1`} className={secondaryButtonClass}>Kampdetaljer</Link></div>)}</div> : <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">Fullfør en managerkamp for å starte karrierehistorikken din.</div>}</section>;
}
