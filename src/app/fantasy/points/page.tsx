import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cardClass, secondaryButtonClass } from "@/components/ui";
import { getT } from "@/i18n/server";
import type { Dictionary } from "@/i18n/dictionaries";
import { currentUser } from "@/lib/auth";
import { currentRound, getCurrentFantasySeason, getTeamRound, type RoundPick } from "@/lib/fantasy/data";
import type { PointsBreakdown } from "@/lib/fantasy/points";
import { FANTASY_POSITIONS } from "@/lib/fantasy/squad-rules";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function PointsChip({ pick, t, captain }: { pick: RoundPick; t: Dictionary; captain: "C" | "V" | null }) {
  const text = t.fantasy;
  const shown = pick.multiplier > 0 ? pick.points * pick.multiplier : pick.points;
  return (
    <div className={`relative grid h-24 w-[3.75rem] content-center justify-items-center gap-1 rounded-xl border bg-black/25 px-0.5 text-center sm:w-24 sm:px-1 ${pick.subbedOut ? "border-white/10 opacity-50" : "border-white/25"}`}>
      {captain ? <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-yellow-300 text-[10px] font-black text-slate-950">{captain === "C" ? text.captainShort : text.viceCaptainShort}</span> : null}
      {pick.subbedIn ? <span className="absolute left-1 top-1 text-xs text-emerald-300" title={text.pointsPage.subbedIn}>▲</span> : null}
      {pick.subbedOut ? <span className="absolute left-1 top-1 text-xs text-red-300" title={text.pointsPage.subbedOut}>▼</span> : null}
      {pick.crest ? <Image src={pick.crest} alt="" width={24} height={24} className="h-6 w-6 object-contain" /> : <span>⚽</span>}
      <span className="w-full truncate text-[10px] font-bold sm:text-xs">{pick.name}</span>
      <span className="rounded bg-white/90 px-1.5 text-xs font-black text-slate-950">{shown}</span>
    </div>
  );
}

function BreakdownList({ picks, t }: { picks: RoundPick[]; t: Dictionary }) {
  const parts = t.fantasy.pointsPage.parts;
  return (
    <section className={`${cardClass} grid gap-2`}>
      <h2 className="font-semibold">{t.fantasy.pointsPage.breakdownTitle}</h2>
      <ul className="grid gap-1 text-sm">
        {picks.map((pick) => {
          const items = pick.breakdown ? (Object.entries(pick.breakdown) as [keyof PointsBreakdown, number][]).filter(([, value]) => value !== 0) : [];
          return (
            <li key={pick.playerId}>
              <details className="rounded-lg px-2 py-1 hover:bg-surface-raised">
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <span className={pick.multiplier === 0 ? "text-muted" : ""}>{pick.name}{pick.multiplier > 1 ? ` (×${pick.multiplier})` : ""}</span>
                  <span className="font-semibold tabular-nums">{pick.points}</span>
                </summary>
                {items.length ? (
                  <ul className="mt-1 grid gap-0.5 pl-4 text-muted">{items.map(([key, value]) => <li key={key} className="flex justify-between"><span>{parts[key]}</span><span className="tabular-nums">{value > 0 ? `+${value}` : value}</span></li>)}</ul>
                ) : <p className="mt-1 pl-4 text-muted">{t.fantasy.pointsPage.noPoints}</p>}
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function FantasyPointsPage({ searchParams }: PageProps<"/fantasy/points">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const t = await getT();
  const text = t.fantasy.pointsPage;
  const season = await getCurrentFantasySeason();
  if (!season) return <div className={cardClass}><p className="text-muted">{t.fantasy.noSeason}</p></div>;
  const latest = currentRound(season);
  if (!latest) return <div className={cardClass}><p className="text-muted">{text.noRounds}</p></div>;

  const params = await searchParams;
  const requested = Number(params.round);
  const round = season.rounds.find((item) => item.number === requested && item.locked) ?? latest;
  // Andre lag kan ses når runden er låst (som i Premier League Fantasy). Uten ?team= vises ditt eget.
  let teamId = typeof params.team === "string" ? params.team : null;
  if (!teamId) {
    const { data } = await supabaseAdmin().from("fantasy_teams").select("id").eq("user_id", user.id).eq("api_season", season.apiSeason).maybeSingle();
    teamId = data?.id ?? null;
  }
  const view = teamId ? await getTeamRound(teamId, round.number, season.apiSeason) : null;
  const locked = season.rounds.filter((item) => item.locked).map((item) => item.number);
  const previous = locked.filter((number) => number < round.number).at(-1);
  const next = locked.find((number) => number > round.number);
  const link = (number: number) => `/fantasy/points?round=${number}${params.team ? `&team=${params.team}` : ""}`;

  const starters = view?.picks.filter((pick) => pick.slot <= 11 || pick.subbedIn) ?? [];
  const playing = starters.filter((pick) => !pick.subbedOut);
  const bench = view?.picks.filter((pick) => !playing.includes(pick)) ?? [];
  const captainOf = (pick: RoundPick) => (view && pick.playerId === view.captainId ? "C" : view && pick.playerId === view.viceCaptainId ? "V" : null);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {previous ? <Link href={link(previous)} className={secondaryButtonClass}>{text.previous}</Link> : <span />}
        <h2 className="text-xl font-bold">{t.fantasy.round(round.number)} <span className="text-sm font-medium text-muted">· {round.finished ? text.finished : text.live}</span></h2>
        {next ? <Link href={link(next)} className={secondaryButtonClass}>{text.next}</Link> : <span />}
      </div>
      {!view ? <div className={cardClass}><p className="text-muted">{text.noTeam}</p></div> : (
        <>
          <div className={`${cardClass} flex flex-wrap items-center justify-between gap-4`}>
            <div><p className="font-semibold">{view.teamName}</p><p className="text-sm text-muted">{view.username}</p></div>
            <div className="flex gap-6 text-center">
              <div><p className="text-xs text-muted">{text.roundPoints}</p><p className="text-3xl font-black">{view.points}</p></div>
              <div><p className="text-xs text-muted">{text.total}</p><p className="text-3xl font-black">{view.totalPoints}</p></div>
            </div>
            <div className="grid text-sm text-muted">
              <span>{text.bench(view.benchPoints)}</span>
              {view.transferCost ? <span>{text.transferCost(view.transferCost)}</span> : null}
              {view.chip ? <span>{text.chip(t.fantasy.chips.names[view.chip])}</span> : null}
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-emerald-900/40 bg-gradient-to-b from-emerald-700 to-emerald-900 p-2 text-white sm:p-4">
            {FANTASY_POSITIONS.map((position) => (
              <div key={position} className="flex flex-wrap justify-center gap-1 sm:gap-2">
                {playing.filter((pick) => pick.position === position).map((pick) => <PointsChip key={pick.playerId} pick={pick} t={t} captain={captainOf(pick)} />)}
              </div>
            ))}
            <div className="mt-2 grid gap-2 rounded-xl bg-black/25 p-2 sm:p-3">
              <p className="text-xs font-bold tracking-widest text-white/70">{t.fantasy.bench.toUpperCase()}</p>
              <div className="flex flex-wrap justify-center gap-1 sm:gap-2">{bench.map((pick) => <PointsChip key={pick.playerId} pick={pick} t={t} captain={captainOf(pick)} />)}</div>
            </div>
          </div>
          <BreakdownList picks={[...playing, ...bench]} t={t} />
        </>
      )}
    </div>
  );
}
