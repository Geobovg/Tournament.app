"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { createCareerChallengeAction } from "@/lib/career-actions";
import type { ActionState } from "@/lib/actions";
import type { CareerProfile } from "@/lib/career";
import type { Friend } from "@/lib/friends";
import { buttonClass, cardClass } from "./ui";

const initial: ActionState = {};

function ChallengeFriends({ friends }: { friends: Friend[] }) {
  const [state, action, pending] = useActionState(createCareerChallengeAction, initial);
  const text = useT().career.dashboard;
  return <section className={`${cardClass} grid gap-3`}><div><h2 className="text-lg font-semibold">{text.challengeHeading}</h2><p className="text-sm text-muted">{text.challengeIntro}</p></div>{friends.length === 0 ? <p className="text-sm text-muted">{text.addFriendsFirst}</p> : <div className="grid gap-2">{friends.map((friend) => <form key={friend.id} action={action} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3"><input type="hidden" name="opponent_id" value={friend.id}/><b className="mr-auto">{friend.username}</b><button className={buttonClass} disabled={pending}>{text.managerMatch}</button></form>)}</div>}{state.error ? <p className="text-sm text-danger">{state.error}</p> : state.ok ? <p className="text-sm text-success">{text.challengeSent}</p> : null}</section>;
}

function CareerRecord({ profile }: { profile: CareerProfile }) {
  const text = useT().career.dashboard;
  const rows = [
    { label: text.allMatches, wins: profile.tournament_wins + profile.manager_career_wins, draws: profile.tournament_draws + profile.manager_career_draws, losses: profile.tournament_losses + profile.manager_career_losses },
    { label: text.tournaments, wins: profile.tournament_wins, draws: profile.tournament_draws, losses: profile.tournament_losses },
    { label: text.managerCareer, wins: profile.manager_career_wins, draws: profile.manager_career_draws, losses: profile.manager_career_losses },
  ];
  return <section className={`${cardClass} grid gap-4`}><div><h2 className="text-lg font-semibold">{text.statsHeading}</h2><p className="text-sm text-muted">{text.statsIntro}</p></div><div className="grid gap-2 sm:grid-cols-3">{rows.map((row) => <div key={row.label} className="rounded-lg border border-border bg-surface-raised p-3"><p className="text-sm font-semibold">{row.label}</p><div className="mt-2 flex gap-3 text-sm"><span className="text-success">{text.winShort} {row.wins}</span><span className="text-accent">{text.drawShort} {row.draws}</span><span className="text-danger">{text.lossShort} {row.losses}</span></div></div>)}</div></section>;
}

type RewardEvent = { id: string; source_type: string; manager_budget: number; created_at: string };

function RewardHistory({ rewards }: { rewards: RewardEvent[] }) {
  const text = useT().career.dashboard;
  return <section className={`${cardClass} grid gap-3`}><div><h2 className="text-lg font-semibold">{text.rewardsHeading}</h2><p className="text-sm text-muted">{text.rewardsIntro}</p></div>{rewards.length ? <div className="grid gap-2">{rewards.map((reward) => <div key={reward.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 text-sm"><span>{text.rewardLabels[reward.source_type] ?? text.reward}</span><span className={reward.manager_budget ? "font-bold text-accent" : "text-muted"}>{reward.manager_budget ? `+${reward.manager_budget} MB` : text.noCurrency}</span></div>)}</div> : <p className="text-sm text-muted">{text.noRewards}</p>}</section>;
}

export function CareerProfileOverview({ profile, rewards }: { profile: CareerProfile; rewards: RewardEvent[] }) {
  const text = useT().career.dashboard; const points = text.points;
  return <div className="grid gap-6"><CareerRecord profile={profile}/><RewardHistory rewards={rewards}/><section className={cardClass}><h2 className="text-lg font-semibold">{text.pointsHeading}</h2><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p>{points.managerMatch}: {points.win} <b>5 MB</b>, {points.draw} <b>2 MB</b>.</p><p>{points.tournamentMatch}: {points.win} <b>3 MB</b>, {points.draw} <b>1 MB</b>.</p><p>{points.tournament}: {points.champion} <b>20 MB</b>, {points.finalist} <b>8 MB</b>.</p></div></section></div>;
}

export function CareerChallengePanel({ friends }: { friends: Friend[] }) {
  return <ChallengeFriends friends={friends}/>;
}
