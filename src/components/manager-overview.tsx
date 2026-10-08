import Link from "next/link";
import { getT } from "@/i18n/server";
import type { CareerChallenge, ManagerMatchHistory } from "@/lib/career";

type Props = { userId: string; challenges: CareerChallenge[]; matches: ManagerMatchHistory[]; record: { wins: number; draws: number; losses: number } };

const resultColors = { win: "bg-lime-300 text-slate-950", draw: "bg-cyan-300 text-slate-950", loss: "bg-rose-400 text-slate-950" };
const resultText = { win: "text-lime-300", draw: "text-cyan-300", loss: "text-rose-400" };
const tileClass = "flex min-h-52 flex-col rounded-xl border border-white/10 bg-slate-900/75 p-5";

type Task = { key: string; title: string; detail: string; href: string; cta: string };

export async function ManagerOverview({ userId, challenges, matches, record }: Props) {
  const t = await getT(); const text = t.career.overview; const results = t.career.results;
  const tasks: Task[] = [
    ...challenges.filter((challenge) => challenge.match_id).map((challenge) => ({ key: `match-${challenge.id}`, title: text.matchAgainst(challenge.opponent_name), detail: challenge.status === "in_progress" ? text.matchInProgress : text.lobbyReady, href: `/managerkarriere/kamp/${challenge.match_id}`, cta: text.openLobby })),
    ...challenges.filter((challenge) => !challenge.match_id && challenge.status === "pending" && challenge.opponent_id === userId).map((challenge) => ({ key: `challenge-${challenge.id}`, title: text.challengesYou(challenge.opponent_name), detail: text.waitingForYourAnswer, href: "/managerkarriere/sesong?tab=venner", cta: text.answer })),
  ];
  const waitingOnOthers = challenges.filter((challenge) => !challenge.match_id && challenge.status === "pending" && challenge.challenger_id === userId).length;
  const last = matches[0];
  const form = matches.slice(0, 5);
  const played = record.wins + record.draws + record.losses;

  return <section><div className="mb-3"><p className="text-xs font-black tracking-[.22em] text-cyan-300">{text.status}</p><h2 className="mt-1 text-2xl font-black">{text.heading}</h2></div><div className="grid gap-3 lg:grid-cols-2">
    <div className={tileClass}><div className="flex items-center justify-between"><p className="text-xs font-black tracking-[.2em] text-white/45">{text.waitingForYou}</p>{tasks.length ? <span className="rounded-full bg-lime-300 px-2 py-0.5 text-xs font-black text-slate-950">{tasks.length}</span> : null}</div>{tasks.length ? <ul className="mt-3 grid gap-2">{tasks.slice(0, 4).map((task) => <li key={task.key}><Link href={task.href} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 transition hover:bg-white/10"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{task.title}</p><p className="truncate text-xs text-white/50">{task.detail}</p></div><span className="shrink-0 text-xs font-black text-lime-300">{task.cta} →</span></Link></li>)}{tasks.length > 4 ? <li className="text-xs text-white/45">{text.more(tasks.length - 4)}</li> : null}</ul> : <div className="mt-auto"><p className="text-lg font-black">{text.nothingWaiting}</p><p className="mt-1 text-sm text-white/50">{waitingOnOthers ? text.waitingOnFriends(waitingOnOthers) : text.challengeAFriend}</p><Link href="/managerkarriere/sesong?tab=venner" className="mt-4 inline-block text-sm font-black text-lime-300 hover:underline">{text.toLobby}</Link></div>}</div>
    <div className={tileClass}><p className="text-xs font-black tracking-[.2em] text-white/45">{text.lastMatch}</p>{last ? <><div className="mt-3 flex items-baseline gap-3"><p className="text-4xl font-black tabular-nums">{last.myScore}<span className="text-white/35"> – </span>{last.opponentScore}</p><p className={`text-sm font-black ${resultText[last.result]}`}>{results[last.result]}</p></div><p className="text-sm text-white/55">{text.against(last.opponentName)}{last.managerBudget ? ` · +${last.managerBudget} MB` : ""}</p><div className="mt-auto flex items-end justify-between gap-3 pt-5"><div><p className="text-[10px] font-black tracking-widest text-white/45">{text.form}</p><div className="mt-1 flex gap-1">{form.map((match) => <span key={match.id} title={text.formTitle(results[match.result], match.myScore, match.opponentScore, match.opponentName)} className={`grid h-6 w-6 place-items-center rounded text-[11px] font-black ${resultColors[match.result]}`}>{results.letters[match.result]}</span>)}</div></div><div className="text-right"><p className="text-[10px] font-black tracking-widest text-white/45">{text.total(played)}</p><p className="mt-1 text-sm font-black tabular-nums">{text.record(record.wins, record.draws, record.losses)}</p></div></div><Link href="/managerkarriere/karrierehistorikk" className="mt-4 text-sm font-black text-cyan-300 hover:underline">{text.fullHistory}</Link></> : <div className="mt-auto"><p className="text-lg font-black">{text.noMatches}</p><p className="mt-1 text-sm text-white/50">{text.firstWinReward}</p><Link href="/managerkarriere/sesong" className="mt-4 inline-block text-sm font-black text-cyan-300 hover:underline">{text.playFirstMatch}</Link></div>}</div>
  </div></section>;
}
