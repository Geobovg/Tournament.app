"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/lib/actions";
import type { FiveOpponent } from "@/lib/femmer/data";
import { playFiveAiAction, playFiveFriendAction } from "@/lib/femmer/actions";
import { FIVE_AI_LEVELS, FIVE_MATCH_REWARDS, fiveAiRating } from "@/lib/femmer/rules";
import { buttonClass, cardClass, secondaryButtonClass } from "../ui";

const initial: ActionState = {};

function FriendRow({ opponent }: { opponent: FiveOpponent }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(playFiveFriendAction, initial);
  return <form action={action} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
    <input type="hidden" name="opponent_id" value={opponent.id} />
    <div><p className="font-black">{opponent.username}</p><p className="text-xs text-muted">{t.play.rating(opponent.rating ?? "—")}</p></div>
    <button type="submit" disabled={pending} className={secondaryButtonClass}>{pending ? t.play.playing : t.play.playFriend}</button>
    {state.error ? <p className="w-full text-sm text-red-400">{state.error}</p> : null}
  </form>;
}

export function FivePlay({ aiLevel, bestAiLevel, opponents, ready, liveMatchId }: { aiLevel: number; bestAiLevel: number; opponents: FiveOpponent[]; ready: boolean; liveMatchId: string | null }) {
  const t = useT().femmer;
  const [state, action, pending] = useActionState(playFiveAiAction, initial);
  const level = Math.min(FIVE_AI_LEVELS, aiLevel);
  return <div className="grid gap-4 lg:grid-cols-2">
    {liveMatchId ? <Link href={`/femmer/kamp/${liveMatchId}`} className="rounded-2xl border border-amber-300/50 bg-amber-300/15 p-4 font-black text-amber-200 lg:col-span-2">{t.play.resume}</Link> : null}
    <section className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-fuchsia-500/30 via-rose-950 to-slate-950 p-5">
      <p className="text-xs font-black tracking-[.25em] text-white/60">{t.play.aiTitle}</p>
      <p className="mt-2 text-5xl font-black">{level}<span className="text-xl text-white/50">/{FIVE_AI_LEVELS}</span></p>
      <p className="mt-2 text-white/80">{t.play.aiText(fiveAiRating(level))}</p>
      <p className="mt-1 text-sm text-white/60">{t.play.rewardLine(FIVE_MATCH_REWARDS.win, FIVE_MATCH_REWARDS.draw, FIVE_MATCH_REWARDS.loss)}</p>
      <p className="mt-1 text-xs text-white/50">{t.play.best(bestAiLevel)}</p>
      {/* Trinnene som stigen består av, med det man står på uthevet. */}
      <div className="mt-4 flex flex-wrap gap-1">{Array.from({ length: FIVE_AI_LEVELS }, (_, index) => index + 1).map((step) => <span key={step} className={`h-2 w-4 rounded-full ${step < level ? "bg-lime-300" : step === level ? "bg-white" : "bg-white/15"}`} />)}</div>
      <form action={action} className="mt-5">
        <button type="submit" disabled={pending || !ready} className={`${buttonClass} bg-white text-slate-950`}>{pending ? t.play.playing : t.play.playAi}</button>
        {!ready ? <p className="mt-2 text-sm text-amber-300">{t.errors.needFive}</p> : null}
        {state.error ? <p className="mt-2 text-sm text-red-300">{state.error}</p> : null}
      </form>
    </section>
    <section className={`${cardClass} grid content-start gap-3`}>
      <div><h3 className="font-black">{t.play.friendsTitle}</h3><p className="text-sm text-muted">{t.play.friendsText}</p></div>
      <p className="text-xs text-muted">{t.play.rewardLine(FIVE_MATCH_REWARDS.win, FIVE_MATCH_REWARDS.draw, FIVE_MATCH_REWARDS.loss)}</p>
      {opponents.length ? opponents.map((opponent) => <FriendRow key={opponent.id} opponent={opponent} />) : <p className="text-sm text-muted">{t.play.noFriends}</p>}
    </section>
    <p className="text-xs text-muted lg:col-span-2">{t.play.rewards}</p>
  </div>;
}
