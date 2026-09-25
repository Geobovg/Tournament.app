"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";
import type { Friend } from "@/lib/friends";
import { createFriendSeasonAction, playAiSeasonMatchAction, playFriendSeasonMatchAction, respondFriendSeasonAction, startFriendSeasonAction } from "@/lib/season-actions";
import type { AiSeason, FriendSeason, SeasonFixture, SeasonTableRow } from "@/lib/seasons";
import { buttonClass, secondaryButtonClass } from "./ui";

const initial: ActionState = {};
const panelClass = "rounded-2xl border border-white/10 bg-slate-900/75 p-4 sm:p-5";
const outcomeText = { promoted: "Opprykk", relegated: "Nedrykk", stayed: "Beholdt plassen" };

/** Posisjonsfarge i AI-tabellen: grønn opprykk, rød nedrykk. */
function zone(position: number, total: number, division: number | null) {
  if (division === null) return position === 1 ? "border-l-lime-300" : "border-l-transparent";
  if (position <= 3 && division > 1) return "border-l-lime-300";
  if (position === total && division < 10) return "border-l-rose-400";
  return "border-l-transparent";
}

export function SeasonTable({ rows, division = null, compact = false }: { rows: SeasonTableRow[]; division?: number | null; compact?: boolean }) {
  return <div className="overflow-hidden rounded-xl border border-white/10">
    <table className="w-full text-sm tabular-nums">
      <thead className="bg-white/5 text-[10px] font-black tracking-widest text-white/45"><tr><th className="py-2 pl-3 text-left">#</th><th className="text-left">KLUBB</th><th>K</th>{compact ? null : <><th>S</th><th>U</th><th>T</th></>}<th>MF</th><th className="pr-3">P</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.participant} className={`border-t border-white/5 border-l-4 ${zone(row.position, rows.length, division)} ${row.isMe ? "bg-lime-300/10 font-black" : ""}`}>
        <td className="py-2 pl-3">{row.position}</td><td className="max-w-40 truncate">{row.name}</td><td className="text-center">{row.played}</td>
        {compact ? null : <><td className="text-center">{row.wins}</td><td className="text-center">{row.draws}</td><td className="text-center">{row.losses}</td></>}
        <td className="text-center">{row.goalsFor - row.goalsAgainst > 0 ? "+" : ""}{row.goalsFor - row.goalsAgainst}</td><td className="pr-3 text-center font-black">{row.points}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function FixtureRow({ fixture, action }: { fixture: SeasonFixture; action?: React.ReactNode }) {
  const done = fixture.status === "completed";
  const mine = fixture.homeIsMe ? fixture.homeScore : fixture.awayScore; const theirs = fixture.homeIsMe ? fixture.awayScore : fixture.homeScore;
  const result = done && mine !== null && theirs !== null ? (mine > theirs ? "text-lime-300" : mine < theirs ? "text-rose-400" : "text-cyan-300") : "";
  return <li className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
    <span className="w-8 shrink-0 text-xs font-black text-white/40">R{fixture.round}</span>
    <span className={`min-w-0 flex-1 truncate ${fixture.homeIsMe ? "font-black" : ""}`}>{fixture.homeName}</span>
    <span className={`shrink-0 font-black tabular-nums ${result}`}>{done ? `${fixture.homeScore} – ${fixture.awayScore}` : fixture.status === "live" ? "LIVE" : "–"}</span>
    <span className={`min-w-0 flex-1 truncate text-right ${fixture.awayIsMe ? "font-black" : ""}`}>{fixture.awayName}</span>
    {action ?? (done && fixture.matchId ? <Link href={`/managerkarriere/kamp/${fixture.matchId}?historikk=1`} className="shrink-0 text-xs font-black text-cyan-300 hover:underline">Se</Link> : <span className="w-6 shrink-0" />)}
  </li>;
}

function opponentOf(fixture: SeasonFixture) { return fixture.homeIsMe ? fixture.awayName : fixture.homeName; }

export function PlayAiMatchButton({ season, large = false }: { season: AiSeason; large?: boolean }) {
  const [state, action, pending] = useActionState(playAiSeasonMatchAction, initial);
  const next = season.nextFixture;
  if (!next) return null;
  return <form action={action} className="grid gap-2">
    <button disabled={pending} className={`rounded-xl bg-lime-300 font-black text-slate-950 transition hover:bg-lime-200 disabled:opacity-60 ${large ? "px-6 py-4 text-lg" : "px-4 py-2.5"}`}>
      {pending ? "Starter kampen …" : next.status === "live" ? `Fortsett kampen mot ${opponentOf(next)} →` : `Spill neste kamp mot ${opponentOf(next)} →`}
    </button>
    {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
  </form>;
}

/** Hovedkortet på forsiden: hvor du står i AI-sesongen og en knapp til neste kamp. */
export function AiSeasonHero({ season }: { season: AiSeason }) {
  const me = season.table.find((row) => row.isMe);
  const around = season.table.filter((row) => me && Math.abs(row.position - me.position) <= 1 || row.position === 1).slice(0, 4);
  return <section className="relative overflow-hidden rounded-2xl border border-lime-300/25 bg-[#07111a] p-5 shadow-2xl sm:p-7" style={{ backgroundImage: "radial-gradient(ellipse at 85% 0%, rgba(152,255,44,.18), transparent 45%), radial-gradient(ellipse at 0% 100%, rgba(24,207,255,.14), transparent 40%)" }}>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
      <div className="flex flex-col">
        <p className="text-xs font-black tracking-[.25em] text-lime-300">AI-SESONG {season.seasonNumber}</p>
        <h2 className="mt-1 text-4xl font-black italic tracking-tight sm:text-5xl">Divisjon {season.division}</h2>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
          <span className="rounded-lg bg-black/35 px-3 py-1.5">Kamp {Math.min(season.played + 1, 10)} av 10</span>
          {me ? <span className="rounded-lg bg-black/35 px-3 py-1.5">{me.position}. plass · {me.points} p</span> : null}
          <span className="rounded-lg bg-black/35 px-3 py-1.5 text-white/60">Topp 3 rykker opp</span>
        </div>
        {season.previous ? <p className="mt-3 text-sm text-white/55">Forrige sesong: {season.previous.position}. plass i divisjon {season.previous.division} · <b className={season.previous.outcome === "promoted" ? "text-lime-300" : season.previous.outcome === "relegated" ? "text-rose-300" : "text-white/80"}>{outcomeText[season.previous.outcome]}</b></p> : null}
        <div className="mt-auto pt-6"><PlayAiMatchButton season={season} large /></div>
      </div>
      <div className="grid content-start gap-2">
        <div className="flex items-baseline justify-between"><p className="text-[10px] font-black tracking-widest text-white/45">TABELLEN</p><Link href="/managerkarriere/sesong" className="text-xs font-black text-cyan-300 hover:underline">Hele tabellen →</Link></div>
        <SeasonTable rows={around} division={season.division} compact />
      </div>
    </div>
  </section>;
}

export function AiSeasonDetails({ season }: { season: AiSeason }) {
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
    <section className={`${panelClass} grid content-start gap-3`}>
      <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-black tracking-[.22em] text-lime-300">AI-SESONG {season.seasonNumber}</p><h2 className="text-2xl font-black">Divisjon {season.division}</h2></div><p className="text-xs text-white/50">Grønn: opprykk · Rød: nedrykk</p></div>
      <SeasonTable rows={season.table} division={season.division} />
      <p className="text-xs text-white/50">Premie ved sesongslutt øker jo høyere divisjon du spiller i. Opprykk gir i tillegg en bonus som blir større for hver divisjon, og pakker fra divisjon 6 og opp.</p>
      <PlayAiMatchButton season={season} />
    </section>
    <section className={`${panelClass} grid content-start gap-3`}>
      <h3 className="text-lg font-black">Dine kamper</h3>
      <ul className="grid gap-1.5">{season.fixtures.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} />)}</ul>
    </section>
  </div>;
}

function PlayFriendFixture({ fixture }: { fixture: SeasonFixture }) {
  const [state, action, pending] = useActionState(playFriendSeasonMatchAction, initial);
  return <form action={action} className="shrink-0"><input type="hidden" name="fixture_id" value={fixture.id} /><button disabled={pending} title={state.error} className="rounded-lg bg-lime-300 px-2.5 py-1 text-xs font-black text-slate-950 disabled:opacity-60">{fixture.status === "live" ? "Se live" : "Spill"}</button>{state.error ? <span className="sr-only">{state.error}</span> : null}</form>;
}

function FriendSeasonCard({ season }: { season: FriendSeason }) {
  const [respondState, respond, responding] = useActionState(respondFriendSeasonAction, initial);
  const [startState, start, starting] = useActionState(startFriendSeasonAction, initial);
  const joined = season.members.filter((member) => member.status === "joined");
  const error = respondState.error ?? startState.error;
  return <section className={`${panelClass} grid content-start gap-3`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-black tracking-[.22em] text-cyan-300">{season.status === "open" ? "VENTER PÅ START" : season.status === "active" ? "VENNESESONG" : "AVSLUTTET"}</p><h3 className="text-xl font-black">{season.name}</h3></div><p className="text-xs text-white/50">{joined.length} {joined.length === 1 ? "manager" : "managere"}</p></div>
    {season.status === "open" ? <>
      <ul className="flex flex-wrap gap-1.5">{season.members.map((member) => <li key={member.userId} className={`rounded-full px-2.5 py-1 text-xs font-bold ${member.status === "joined" ? "bg-lime-300/15 text-lime-200" : "bg-white/5 text-white/50"}`}>{member.username}{member.status === "invited" ? " (invitert)" : ""}</li>)}</ul>
      {season.myStatus === "invited" ? <form action={respond} className="flex gap-2"><input type="hidden" name="season_id" value={season.id} /><button name="answer" value="join" disabled={responding} className={buttonClass}>Bli med</button><button name="answer" value="decline" disabled={responding} className={secondaryButtonClass}>Nei takk</button></form>
        : season.isOwner ? <form action={start}><input type="hidden" name="season_id" value={season.id} /><button disabled={starting || joined.length < 2} className={buttonClass}>Start sesongen</button><p className="mt-1 text-xs text-white/45">Alle som har blitt med møter hverandre én gang. De som ikke har svart, blir ikke med.</p></form>
        : <p className="text-sm text-white/55">Venter på at sesongen startes.</p>}
    </> : <>
      <SeasonTable rows={season.table} />
      {season.status === "active" ? <ul className="grid gap-1.5">{season.fixtures.filter((fixture) => fixture.homeIsMe || fixture.awayIsMe).map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} action={fixture.status === "completed" ? undefined : <PlayFriendFixture fixture={fixture} />} />)}</ul> : null}
    </>}
    {error ? <p className="text-sm text-rose-300">{error}</p> : null}
  </section>;
}

function CreateFriendSeason({ friends }: { friends: Friend[] }) {
  const [state, action, pending] = useActionState(createFriendSeasonAction, initial);
  return <section className={`${panelClass} grid content-start gap-3`}>
    <div><p className="text-xs font-black tracking-[.22em] text-cyan-300">NY VENNESESONG</p><h3 className="text-xl font-black">Konkurrer mot vennene dine</h3><p className="mt-1 text-sm text-white/55">Alle møter alle én gang. Vinneren får 100 MB og en gullpakke, andreplass 50 MB og tredjeplass 25 MB.</p></div>
    {friends.length ? <form action={action} className="grid gap-3">
      <input name="name" required maxLength={40} placeholder="Navn på sesongen" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2" />
      <fieldset className="grid gap-1.5"><legend className="mb-1 text-xs font-black tracking-widest text-white/45">INVITER</legend>{friends.map((friend) => <label key={friend.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"><input type="checkbox" name="friend_id" value={friend.id} />{friend.username}</label>)}</fieldset>
      <button disabled={pending} className={buttonClass}>Opprett og inviter</button>
      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : state.ok ? <p className="text-sm text-lime-300">Sesongen er opprettet. Start den når vennene har svart.</p> : null}
    </form> : <p className="text-sm text-white/55">Legg til venner under <Link href="/venner" className="text-cyan-300 hover:underline">Venner</Link> for å starte en vennesesong.</p>}
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
  const invites = seasons.filter((season) => season.status === "open" && season.myStatus === "invited");
  const withMatch = seasons.find((season) => season.status === "active" && season.nextFixture);
  if (!invites.length && !withMatch) return null;
  return <Link href="/managerkarriere/sesong?tab=venner" className="flex items-center gap-4 rounded-2xl border border-cyan-300/25 bg-slate-900/75 p-4 transition hover:border-cyan-300/60">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-300 text-lg font-black text-slate-950">{withMatch ? "⚽" : "✉"}</span>
    <div className="min-w-0 flex-1">{withMatch?.nextFixture ? <><p className="text-xs font-black tracking-widest text-cyan-300">VENNESESONG · {withMatch.name.toUpperCase()}</p><p className="truncate font-black">Neste: mot {opponentOf(withMatch.nextFixture)}</p></> : <><p className="text-xs font-black tracking-widest text-cyan-300">INVITASJON</p><p className="truncate font-black">Du er invitert til {invites[0].name}</p></>}</div>
    <span className="shrink-0 text-sm font-black text-cyan-300">Åpne →</span>
  </Link>;
}
