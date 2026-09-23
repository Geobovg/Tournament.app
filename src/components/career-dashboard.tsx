"use client";

import { useActionState } from "react";
import { createCareerChallengeAction } from "@/lib/career-actions";
import type { ActionState } from "@/lib/actions";
import type { CareerProfile } from "@/lib/career";
import type { Friend } from "@/lib/friends";
import { buttonClass, cardClass } from "./ui";

const initial: ActionState = {};

function ChallengeFriends({ friends }: { friends: Friend[] }) {
  const [state, action, pending] = useActionState(createCareerChallengeAction, initial);
  return <section className={`${cardClass} grid gap-3`}><div><h2 className="text-lg font-semibold">Utfordre en venn i managerkarriere</h2><p className="text-sm text-muted">Spill en taktisk kamp med elleverne deres.</p></div>{friends.length === 0 ? <p className="text-sm text-muted">Legg til venner først for å starte en managerkamp.</p> : <div className="grid gap-2">{friends.map((friend) => <form key={friend.id} action={action} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3"><input type="hidden" name="opponent_id" value={friend.id}/><b className="mr-auto">{friend.username}</b><button className={buttonClass} disabled={pending}>Managerkamp</button></form>)}</div>}{state.error ? <p className="text-sm text-danger">{state.error}</p> : state.ok ? <p className="text-sm text-success">Utfordringen er sendt.</p> : null}</section>;
}

function CareerRecord({ profile }: { profile: CareerProfile }) {
  const rows = [
    { label: "Alle kamper", wins: profile.tournament_wins + profile.manager_career_wins, draws: profile.tournament_draws + profile.manager_career_draws, losses: profile.tournament_losses + profile.manager_career_losses },
    { label: "Turneringer", wins: profile.tournament_wins, draws: profile.tournament_draws, losses: profile.tournament_losses },
    { label: "Managerkarriere", wins: profile.manager_career_wins, draws: profile.manager_career_draws, losses: profile.manager_career_losses },
  ];
  return <section className={`${cardClass} grid gap-4`}><div><h2 className="text-lg font-semibold">Kampstatistikk</h2><p className="text-sm text-muted">V/U/T lagres på profilen din, også dersom en turnering senere slettes.</p></div><div className="grid gap-2 sm:grid-cols-3">{rows.map((row) => <div key={row.label} className="rounded-lg border border-border bg-surface-raised p-3"><p className="text-sm font-semibold">{row.label}</p><div className="mt-2 flex gap-3 text-sm"><span className="text-success">V {row.wins}</span><span className="text-accent">U {row.draws}</span><span className="text-danger">T {row.losses}</span></div></div>)}</div></section>;
}

type RewardEvent = { id: string; source_type: string; manager_budget: number; created_at: string };
const rewardLabels: Record<string, string> = { tournament_match: "Turneringskamp", tournament_champion: "Turneringsmester", tournament_finalist: "Finalist", career_match: "Managerkamp", market_sale: "Kort solgt" };

function RewardHistory({ rewards }: { rewards: RewardEvent[] }) {
  return <section className={`${cardClass} grid gap-3`}><div><h2 className="text-lg font-semibold">Nylige belønninger</h2><p className="text-sm text-muted">Fast historikk over managerbudsjettet du har tjent.</p></div>{rewards.length ? <div className="grid gap-2">{rewards.map((reward) => <div key={reward.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 text-sm"><span>{rewardLabels[reward.source_type] ?? "Belønning"}</span><span className={reward.manager_budget ? "font-bold text-accent" : "text-muted"}>{reward.manager_budget ? `+${reward.manager_budget} MB` : "Ingen valuta"}</span></div>)}</div> : <p className="text-sm text-muted">Spill en kamp eller fullfør en turnering for å fylle historikken.</p>}</section>;
}

export function CareerProfileOverview({ profile, rewards }: { profile: CareerProfile; rewards: RewardEvent[] }) {
  return <div className="grid gap-6"><CareerRecord profile={profile}/><RewardHistory rewards={rewards}/><section className={cardClass}><h2 className="text-lg font-semibold">Poengsystem</h2><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p>Managerkamp: seier <b>5 MB</b>, uavgjort <b>2 MB</b>.</p><p>Turneringskamp: seier <b>3 MB</b>, uavgjort <b>1 MB</b>.</p><p>Turnering: mester <b>20 MB</b>, finalist <b>8 MB</b>.</p></div></section></div>;
}

export function CareerChallengePanel({ friends }: { friends: Friend[] }) {
  return <ChallengeFriends friends={friends}/>;
}
