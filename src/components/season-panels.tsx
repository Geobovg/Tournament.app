"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";
import type { Friend } from "@/lib/friends";
import { createFriendSeasonAction, playAiSeasonMatchAction, playFriendSeasonMatchAction, respondFriendSeasonAction, startFriendSeasonAction } from "@/lib/season-actions";
import { arenaOf, lastArena } from "@/lib/arenas";
import { directPromotionSpots, isRelegation, playoffPosition } from "@/lib/season-rules";
import type { AiSeason, FriendSeason, SeasonFixture, SeasonTableRow } from "@/lib/seasons";
import { useT } from "@/i18n/client";
import { arenaBackground, ArenaRoad, ArenaUnlockCelebration, StadiumIllustration } from "./arena-scene";
import { buttonClass, secondaryButtonClass } from "./ui";

const initial: ActionState = {};
const panelClass = "rounded-2xl border border-white/10 bg-slate-900/75 p-4 sm:p-5";

/** Posisjonsfarge i AI-tabellen: grønn opprykk, blå kvalik, rød nedrykk. */
function zone(position: number, division: number | null, arena: number) {
  if (division === null) return position === 1 ? "border-l-lime-300" : "border-l-transparent";
  if (position <= directPromotionSpots(division)) return "border-l-lime-300";
  if (position === playoffPosition(division, arena)) return "border-l-cyan-300";
  if (isRelegation(position, division)) return "border-l-rose-400";
  return "border-l-transparent";
}

export function SeasonTable({ rows, division = null, arena = 1, compact = false }: { rows: SeasonTableRow[]; division?: number | null; arena?: number; compact?: boolean }) {
  const t = useT();
  const head = t.seasons.table;
  return <div className="overflow-hidden rounded-xl border border-white/10">
    <table className="w-full text-sm tabular-nums">
      <thead className="bg-white/5 text-[10px] font-black tracking-widest text-white/45"><tr><th className="py-2 pl-3 text-left">#</th><th className="text-left">{head.club}</th><th>{head.played}</th>{compact ? null : <><th>{head.wins}</th><th>{head.draws}</th><th>{head.losses}</th></>}<th>{head.goalDifference}</th><th className="pr-3">{head.points}</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.participant} className={`border-t border-white/5 border-l-4 ${zone(row.position, division, arena)} ${row.isMe ? "bg-lime-300/10 font-black" : ""}`}>
        <td className="py-2 pl-3">{row.position}</td><td className="max-w-40 truncate">{row.name}</td><td className="text-center">{row.played}</td>
        {compact ? null : <><td className="text-center">{row.wins}</td><td className="text-center">{row.draws}</td><td className="text-center">{row.losses}</td></>}
        <td className="text-center">{row.goalsFor - row.goalsAgainst > 0 ? "+" : ""}{row.goalsFor - row.goalsAgainst}</td><td className="pr-3 text-center font-black">{row.points}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function FixtureRow({ fixture, action }: { fixture: SeasonFixture; action?: React.ReactNode }) {
  const t = useT();
  const done = fixture.status === "completed";
  const mine = fixture.homeIsMe ? fixture.homeScore : fixture.awayScore; const theirs = fixture.homeIsMe ? fixture.awayScore : fixture.homeScore;
  const result = done && mine !== null && theirs !== null ? (mine > theirs ? "text-lime-300" : mine < theirs ? "text-rose-400" : "text-cyan-300") : "";
  return <li className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
    <span className={`w-8 shrink-0 text-xs font-black ${fixture.playoff ? "text-cyan-300" : "text-white/40"}`}>{fixture.playoff ? t.seasons.fixture.playoff : t.seasons.fixture.round(fixture.round)}</span>
    <span className={`min-w-0 flex-1 truncate ${fixture.homeIsMe ? "font-black" : ""}`}>{fixture.homeName}</span>
    <span className={`shrink-0 font-black tabular-nums ${result}`}>{done ? `${fixture.homeScore} – ${fixture.awayScore}` : fixture.status === "live" ? t.seasons.fixture.live : "–"}</span>
    <span className={`min-w-0 flex-1 truncate text-right ${fixture.awayIsMe ? "font-black" : ""}`}>{fixture.awayName}</span>
    {action ?? (done && fixture.matchId ? <Link href={`/managerkarriere/kamp/${fixture.matchId}?historikk=1`} className="shrink-0 text-xs font-black text-cyan-300 hover:underline">{t.seasons.fixture.view}</Link> : <span className="w-6 shrink-0" />)}
  </li>;
}

function opponentOf(fixture: SeasonFixture) { return fixture.homeIsMe ? fixture.awayName : fixture.homeName; }

export function PlayAiMatchButton({ season, large = false }: { season: AiSeason; large?: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState(playAiSeasonMatchAction, initial);
  const next = season.nextFixture;
  if (!next) return null;
  return <form action={action} className="grid gap-2">
    <button disabled={pending} className={`rounded-xl bg-lime-300 font-black text-slate-950 transition hover:bg-lime-200 disabled:opacity-60 ${large ? "px-6 py-4 text-lg" : "px-4 py-2.5"}`}>
      {pending ? t.seasons.play.starting : next.status === "live" ? t.seasons.play.continue(opponentOf(next)) : t.seasons.play.next(opponentOf(next))}
    </button>
    {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
  </form>;
}

/** Hvem som rykker opp. I divisjon 1 går vinneren til neste arena, eller blir mester på Camp Nou. */
function promotionText(t: ReturnType<typeof useT>, season: AiSeason) {
  if (season.division > 1) return t.seasons.ai.promotionRule(directPromotionSpots(season.division));
  return season.arena >= lastArena ? t.seasons.arena.toChampion : t.seasons.arena.toNextArena(arenaOf(season.arena + 1).name);
}

/** Hovedkortet på forsiden: hvor du står i AI-sesongen og en knapp til neste kamp. */
export function AiSeasonHero({ season }: { season: AiSeason }) {
  const t = useT();
  const me = season.table.find((row) => row.isMe);
  const around = season.table.filter((row) => me && Math.abs(row.position - me.position) <= 1 || row.position === 1).slice(0, 4);
  const arena = arenaOf(season.arena);
  return <section className="relative overflow-hidden rounded-2xl border p-5 shadow-2xl sm:p-7" style={{ background: arenaBackground(season.arena), borderColor: `${arena.colors.primary}40` }}>
    <StadiumIllustration arena={season.arena} className="pointer-events-none absolute -right-6 top-0 h-40 w-80 opacity-40" />
    <ArenaUnlockCelebration season={season} />
    <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
      <div className="flex flex-col">
        <p className="text-xs font-black tracking-[.25em]" style={{ color: arena.colors.primary }}>{t.seasons.ai.eyebrow(season.seasonNumber)} · {t.seasons.arena.eyebrow(season.arena)} {arena.name.toUpperCase()}</p>
        <h2 className="mt-1 text-4xl font-black italic tracking-tight sm:text-5xl">{t.seasons.division(season.division)}</h2>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
          {season.inPlayoff ? <span className="rounded-lg bg-cyan-300/15 px-3 py-1.5 text-cyan-200">{t.seasons.ai.playoffMatch}</span> : <span className="rounded-lg bg-black/35 px-3 py-1.5">{t.seasons.ai.matchOf(Math.min(season.played + 1, 10), 10)}</span>}
          {me ? <span className="rounded-lg bg-black/35 px-3 py-1.5">{t.seasons.ai.place(me.position, me.points)}</span> : null}
          <span className="rounded-lg bg-black/35 px-3 py-1.5 text-white/60">{promotionText(t, season)}</span>
        </div>
        {season.inPlayoff ? <p className="mt-3 text-sm text-cyan-100/80">{t.seasons.ai.playoffInfo}</p> : null}
        {season.previous ? <p className="mt-3 text-sm text-white/55">{t.seasons.ai.previous(season.previous.position, season.previous.division)}<b className={season.previous.outcome === "promoted" || season.previous.outcome === "champion" ? "text-lime-300" : season.previous.outcome === "relegated" ? "text-rose-300" : "text-white/80"}>{t.seasons.outcome[season.previous.outcome]}</b></p> : null}
        <div className="mt-auto pt-6"><PlayAiMatchButton season={season} large /></div>
      </div>
      <div className="grid content-start gap-2">
        <div className="flex items-baseline justify-between"><p className="text-[10px] font-black tracking-widest text-white/45">{t.seasons.ai.tableHeading}</p><Link href="/managerkarriere/sesong" className="text-xs font-black text-cyan-300 hover:underline">{t.seasons.ai.fullTable}</Link></div>
        <SeasonTable rows={around} division={season.division} arena={season.arena} compact />
      </div>
    </div>
  </section>;
}

export function AiSeasonDetails({ season }: { season: AiSeason }) {
  const t = useT();
  const arena = arenaOf(season.arena);
  return <div className="grid gap-4">
    <ArenaUnlockCelebration season={season} />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
      <section className={`${panelClass} grid content-start gap-3`} style={{ background: arenaBackground(season.arena), borderColor: `${arena.colors.primary}40` }}>
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-black tracking-[.22em]" style={{ color: arena.colors.primary }}>{t.seasons.ai.eyebrow(season.seasonNumber)} · {arena.name.toUpperCase()}</p><h2 className="text-2xl font-black">{t.seasons.division(season.division)}</h2></div><p className="text-xs text-white/50">{t.seasons.ai.legend}</p></div>
        <SeasonTable rows={season.table} division={season.division} arena={season.arena} />
        <p className="text-xs text-white/50">{promotionText(t, season)}{playoffPosition(season.division, season.arena) ? ` · ${season.division === 1 ? t.seasons.arena.playoffInfo(arenaOf(season.arena + 1).name) : t.seasons.ai.playoffInfo}` : ""}</p>
        <p className="text-xs text-white/50">{t.seasons.ai.prizeInfo} {t.seasons.arena.prizeFactor(arena.factor)}</p>
        <PlayAiMatchButton season={season} />
      </section>
      <section className={`${panelClass} grid content-start gap-3`}>
        <h3 className="text-lg font-black">{t.seasons.ai.yourMatches}</h3>
        <ul className="grid gap-1.5">{season.fixtures.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} />)}</ul>
      </section>
    </div>
    <ArenaRoad season={season} />
  </div>;
}

function PlayFriendFixture({ fixture }: { fixture: SeasonFixture }) {
  const t = useT();
  const [state, action, pending] = useActionState(playFriendSeasonMatchAction, initial);
  return <form action={action} className="shrink-0"><input type="hidden" name="fixture_id" value={fixture.id} /><button disabled={pending} title={state.error} className="rounded-lg bg-lime-300 px-2.5 py-1 text-xs font-black text-slate-950 disabled:opacity-60">{fixture.status === "live" ? t.seasons.friend.watchLive : t.seasons.friend.play}</button>{state.error ? <span className="sr-only">{state.error}</span> : null}</form>;
}

function FriendSeasonCard({ season }: { season: FriendSeason }) {
  const t = useT();
  const copy = t.seasons.friend;
  const [respondState, respond, responding] = useActionState(respondFriendSeasonAction, initial);
  const [startState, start, starting] = useActionState(startFriendSeasonAction, initial);
  const joined = season.members.filter((member) => member.status === "joined");
  const error = respondState.error ?? startState.error;
  return <section className={`${panelClass} grid content-start gap-3`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-black tracking-[.22em] text-cyan-300">{copy.status[season.status]}</p><h3 className="text-xl font-black">{season.name}</h3></div><p className="text-xs text-white/50">{copy.managers(joined.length)}</p></div>
    {season.status === "open" ? <>
      <ul className="flex flex-wrap gap-1.5">{season.members.map((member) => <li key={member.userId} className={`rounded-full px-2.5 py-1 text-xs font-bold ${member.status === "joined" ? "bg-lime-300/15 text-lime-200" : "bg-white/5 text-white/50"}`}>{member.username}{member.status === "invited" ? copy.invitedSuffix : ""}</li>)}</ul>
      {season.myStatus === "invited" ? <form action={respond} className="flex gap-2"><input type="hidden" name="season_id" value={season.id} /><button name="answer" value="join" disabled={responding} className={buttonClass}>{copy.join}</button><button name="answer" value="decline" disabled={responding} className={secondaryButtonClass}>{copy.decline}</button></form>
        : season.isOwner ? <form action={start}><input type="hidden" name="season_id" value={season.id} /><button disabled={starting || joined.length < 2} className={buttonClass}>{copy.start}</button><p className="mt-1 text-xs text-white/45">{copy.startHint}</p></form>
        : <p className="text-sm text-white/55">{copy.waitingForStart}</p>}
    </> : <>
      <SeasonTable rows={season.table} />
      {season.status === "active" ? <ul className="grid gap-1.5">{season.fixtures.filter((fixture) => fixture.homeIsMe || fixture.awayIsMe).map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} action={fixture.status === "completed" ? undefined : <PlayFriendFixture fixture={fixture} />} />)}</ul> : null}
    </>}
    {error ? <p className="text-sm text-rose-300">{error}</p> : null}
  </section>;
}

function CreateFriendSeason({ friends }: { friends: Friend[] }) {
  const t = useT();
  const copy = t.seasons.create;
  const [state, action, pending] = useActionState(createFriendSeasonAction, initial);
  return <section className={`${panelClass} grid content-start gap-3`}>
    <div><p className="text-xs font-black tracking-[.22em] text-cyan-300">{copy.eyebrow}</p><h3 className="text-xl font-black">{copy.title}</h3><p className="mt-1 text-sm text-white/55">{copy.intro}</p></div>
    {friends.length ? <form action={action} className="grid gap-3">
      <input name="name" required maxLength={40} placeholder={copy.namePlaceholder} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2" />
      <fieldset className="grid gap-1.5"><legend className="mb-1 text-xs font-black tracking-widest text-white/45">{copy.invite}</legend>{friends.map((friend) => <label key={friend.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"><input type="checkbox" name="friend_id" value={friend.id} />{friend.username}</label>)}</fieldset>
      <button disabled={pending} className={buttonClass}>{copy.submit}</button>
      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : state.ok ? <p className="text-sm text-lime-300">{copy.created}</p> : null}
    </form> : <p className="text-sm text-white/55">{copy.noFriendsBefore}<Link href="/venner" className="text-cyan-300 hover:underline">{copy.friendsLink}</Link>{copy.noFriendsAfter}</p>}
  </section>;
}

export function FriendSeasonsPanel({ seasons, friends }: { seasons: FriendSeason[]; friends: Friend[] }) {
  return <div className="grid gap-4 lg:grid-cols-2">
    {seasons.map((season) => <FriendSeasonCard key={season.id} season={season} />)}
    <CreateFriendSeason friends={friends} />
  </div>;
}

/** Kort på forsiden når en vennesesong venter på deg: en kamp å spille, eller en invitasjon. */
export function FriendSeasonTeaser({ seasons }: { seasons: FriendSeason[] }) {
  const t = useT();
  const copy = t.seasons.teaser;
  const invites = seasons.filter((season) => season.status === "open" && season.myStatus === "invited");
  const withMatch = seasons.find((season) => season.status === "active" && season.nextFixture);
  if (!invites.length && !withMatch) return null;
  return <Link href="/managerkarriere/sesong?tab=venner" className="flex items-center gap-4 rounded-2xl border border-cyan-300/25 bg-slate-900/75 p-4 transition hover:border-cyan-300/60">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-300 text-lg font-black text-slate-950">{withMatch ? "⚽" : "✉"}</span>
    <div className="min-w-0 flex-1">{withMatch?.nextFixture ? <><p className="text-xs font-black tracking-widest text-cyan-300">{copy.eyebrow(withMatch.name.toUpperCase())}</p><p className="truncate font-black">{copy.next(opponentOf(withMatch.nextFixture))}</p></> : <><p className="text-xs font-black tracking-widest text-cyan-300">{copy.invitation}</p><p className="truncate font-black">{copy.invitedTo(invites[0].name)}</p></>}</div>
    <span className="shrink-0 text-sm font-black text-cyan-300">{copy.open}</span>
  </Link>;
}
