"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/lib/actions";
import { createFiveSeasonAction, declineFiveSeasonAction, inviteFiveSeasonAction, joinFiveSeasonAction, playFiveFixtureAction, startFiveSeasonAction } from "@/lib/femmer/actions";
import type { FiveSeason, FiveSeasonFixture } from "@/lib/femmer/seasons";
import { buttonClass, cardClass, secondaryButtonClass } from "../ui";

const initial: ActionState = {};
type Friend = { id: string; username: string };

function SimpleForm({ action, fields, label, className = buttonClass }: { action: (state: ActionState, formData: FormData) => Promise<ActionState>; fields: Record<string, string>; label: string; className?: string }) {
  const [state, run, pending] = useActionState(action, initial);
  return <form action={run} className="grid gap-1">
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <button type="submit" disabled={pending} className={className}>{label}</button>
    {state.error ? <p className="text-xs text-red-400">{state.error}</p> : null}
  </form>;
}

function CreateSeason({ friends }: { friends: Friend[] }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(createFiveSeasonAction, initial);
  return <form action={action} className={`${cardClass} grid content-start gap-3`}>
    <h3 className="font-black">{t.seasons.create}</h3>
    <input name="name" required maxLength={40} placeholder={t.seasons.namePlaceholder} className="rounded-lg border border-border bg-surface px-3 py-2" />
    {friends.length ? <fieldset className="grid gap-1"><legend className="mb-1 text-sm font-bold">{t.seasons.inviteFriends}</legend>{friends.map((friend) => <label key={friend.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="friend_id" value={friend.id} />{friend.username}</label>)}</fieldset> : <p className="text-sm text-muted">{t.seasons.noFriends}</p>}
    <p className="text-xs text-muted">{t.seasons.rules}</p>
    <button type="submit" disabled={pending} className={buttonClass}>{t.seasons.createButton}</button>
    {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
  </form>;
}

/** Fanen med vennesesonger: invitasjoner, sesongene man er med i, og skjemaet for å lage en ny. */
export function FiveSeasons({ seasons, friends, userId }: { seasons: FiveSeason[]; friends: Friend[]; userId: string }) {
  const t = useT().femmer;
  const invites = seasons.filter((season) => season.status === "open" && season.members.some((member) => member.userId === userId && member.status === "invited"));
  const mine = seasons.filter((season) => !invites.includes(season));
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="grid content-start gap-3">
      {invites.map((season) => <section key={season.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/50 bg-amber-300/10 p-3">
        <div><p className="font-black">{season.name}</p><p className="text-xs text-muted">{t.seasons.invitedBy(season.ownerName)}</p></div>
        <div className="flex gap-2"><SimpleForm action={joinFiveSeasonAction} fields={{ season_id: season.id }} label={t.seasons.join} /><SimpleForm action={declineFiveSeasonAction} fields={{ season_id: season.id }} label={t.seasons.decline} className={secondaryButtonClass} /></div>
      </section>)}
      {mine.length === 0 && invites.length === 0 ? <p className="text-muted">{t.seasons.empty}</p> : null}
      {mine.map((season) => {
        const me = season.table.findIndex((row) => row.userId === userId);
        return <Link key={season.id} href={`/femmer/sesong/${season.id}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-3 transition hover:border-lime-300/50">
          <div className="min-w-0 flex-1"><p className="truncate font-black">{season.name}</p><p className="text-xs text-muted">{t.seasons.status[season.status]} · {t.seasons.members(season.members.filter((member) => member.status === "joined").length)}</p></div>
          {season.status !== "open" && me >= 0 ? <span className="text-sm font-black">{t.seasons.place(me + 1)}</span> : null}
        </Link>;
      })}
    </div>
    <CreateSeason friends={friends} />
  </div>;
}

function FixtureRow({ fixture, names, userId }: { fixture: FiveSeasonFixture; names: Map<string, string>; userId: string }) {
  const t = useT().femmer;
  const mine = fixture.homeUserId === userId || fixture.awayUserId === userId;
  return <li className={`flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm ${mine ? "bg-lime-300/10" : "bg-white/5"}`}>
    <span className="min-w-0 flex-1 truncate text-right font-bold">{names.get(fixture.homeUserId)}</span>
    {fixture.status === "played" && fixture.matchId ? <Link href={`/femmer/kamp/${fixture.matchId}`} className="rounded bg-white/10 px-2 py-0.5 font-black tabular-nums hover:bg-white/20">{fixture.homeScore}–{fixture.awayScore}</Link> : <span className="px-2 text-white/40">–</span>}
    <span className="min-w-0 flex-1 truncate font-bold">{names.get(fixture.awayUserId)}</span>
    {mine && fixture.status === "scheduled" ? <SimpleForm action={playFiveFixtureAction} fields={{ fixture_id: fixture.id }} label={t.seasons.play} className={`${buttonClass} px-3 py-1 text-xs`} /> : null}
    {fixture.status === "live" && fixture.matchId ? <Link href={`/femmer/kamp/${fixture.matchId}`} className={`${secondaryButtonClass} px-3 py-1 text-xs`}>{t.seasons.live}</Link> : null}
  </li>;
}

/** Sesongsiden: tabell, kampoppsett, invitasjoner og start. */
export function FiveSeasonDetails({ season, userId, friends }: { season: FiveSeason; userId: string; friends: Friend[] }) {
  const t = useT().femmer;
  const [copied, setCopied] = useState(false);
  const invitePath = `/join/femmer/${season.inviteCode}`;
  const names = new Map(season.members.map((member) => [member.userId, member.username]));
  const joined = season.members.filter((member) => member.status === "joined");
  const invited = season.members.filter((member) => member.status === "invited");
  const isMember = joined.some((member) => member.userId === userId);
  const rounds = [...new Set(season.fixtures.map((fixture) => fixture.round))];
  const notInvited = friends.filter((friend) => !season.members.some((member) => member.userId === friend.id));

  return <div className="grid gap-4">
    <section className={`${cardClass} grid gap-2`}>
      <p className="text-xs font-black tracking-widest text-fuchsia-300">{t.seasons.status[season.status]}</p>
      <h2 className="text-2xl font-black">{season.name}</h2>
      <p className="text-sm text-muted">{t.seasons.createdBy(season.ownerName)} · {t.seasons.members(joined.length)}</p>
      {season.status === "open" ? <>
        <p className="text-sm text-muted">{t.seasons.rules}</p>
        <div className="flex flex-wrap items-center gap-2"><code className="rounded bg-black/30 px-2 py-1 text-xs">{invitePath}</code><button type="button" onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}${invitePath}`); setCopied(true); }} className={secondaryButtonClass}>{copied ? t.seasons.copied : t.seasons.copyLink}</button></div>
        {invited.length ? <p className="text-sm">{t.seasons.waitingFor(invited.map((member) => member.username).join(", "))}</p> : null}
        {isMember && notInvited.length ? <div className="flex flex-wrap gap-2">{notInvited.map((friend) => <SimpleForm key={friend.id} action={inviteFiveSeasonAction} fields={{ season_id: season.id, friend_id: friend.id }} label={`+ ${friend.username}`} className={`${secondaryButtonClass} px-3 py-1 text-xs`} />)}</div> : null}
        {season.ownerId === userId ? <SimpleForm action={startFiveSeasonAction} fields={{ season_id: season.id }} label={t.seasons.start} /> : null}
        {!isMember && invited.some((member) => member.userId === userId) ? <SimpleForm action={joinFiveSeasonAction} fields={{ season_id: season.id }} label={t.seasons.join} /> : null}
      </> : null}
    </section>

    <section className={`${cardClass} grid gap-2 overflow-x-auto`}>
      <h3 className="font-black">{t.seasons.table}</h3>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted"><th className="py-1">#</th><th>{t.seasons.manager}</th><th className="text-right">{t.seasons.cols.played}</th><th className="text-right">{t.seasons.cols.wins}</th><th className="text-right">{t.seasons.cols.draws}</th><th className="text-right">{t.seasons.cols.losses}</th><th className="text-right">{t.seasons.cols.goals}</th><th className="text-right">{t.seasons.cols.points}</th></tr></thead>
        <tbody>{season.table.map((row, index) => <tr key={row.userId} className={`border-t border-white/10 ${row.userId === userId ? "font-black text-lime-300" : ""}`}>
          <td className="py-1.5">{index + 1}</td><td>{row.username}</td>
          <td className="text-right">{row.played}</td><td className="text-right">{row.wins}</td><td className="text-right">{row.draws}</td><td className="text-right">{row.losses}</td><td className="text-right">{row.goalsFor}–{row.goalsAgainst}</td><td className="text-right">{row.points}</td>
        </tr>)}</tbody>
      </table>
    </section>

    {rounds.length ? <section className={`${cardClass} grid gap-3`}>
      <h3 className="font-black">{t.seasons.fixtures}</h3>
      <p className="text-xs text-muted">{t.seasons.fixtureRule}</p>
      {rounds.map((round) => <div key={round} className="grid gap-1"><p className="text-xs font-black text-muted">{t.seasons.round(round)}</p><ul className="grid gap-1">{season.fixtures.filter((fixture) => fixture.round === round).map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} names={names} userId={userId} />)}</ul></div>)}
    </section> : null}
  </div>;
}
