"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";
import { acceptCareerChallengeAction, startCareerMatchAction } from "@/lib/career-actions";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";

type Challenge = { id: string; challenger_id: string; opponent_id: string; mode: "player" | "manager"; status: string; match_id: string | null; opponent_name: string };
const initial: ActionState = {};

export function ChallengeLobby({ challenges, userId, mode }: { challenges: Challenge[]; userId: string; mode?: "player" | "manager" }) {
  const [acceptState, acceptAction, accepting] = useActionState(acceptCareerChallengeAction, initial); const [startState, startAction, starting] = useActionState(startCareerMatchAction, initial);
  const relevantChallenges = mode ? challenges.filter((challenge) => challenge.mode === mode) : challenges;
  if (!relevantChallenges.length) return null;
  return <section className={`${cardClass} grid gap-3`}><div><h2 className="text-lg font-semibold">Kamplobby</h2><p className="text-sm text-muted">Godta utfordringen, åpne lobbyen og start når dere er klare.</p></div>{relevantChallenges.map((challenge) => { const incoming = challenge.opponent_id === userId && challenge.status === "pending"; return <div key={challenge.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"><div className="mr-auto"><b>{challenge.opponent_name}</b><p className="text-xs text-muted">{challenge.mode === "manager" ? "Managerkamp" : "Spillerkarriere"} · {challenge.status === "pending" ? "Venter på svar" : "Lobby klar"}</p></div>{incoming ? <form action={acceptAction}><input type="hidden" name="challenge_id" value={challenge.id}/><button className={buttonClass} disabled={accepting}>Godta</button></form> : null}{challenge.match_id ? <><form action={startAction}><input type="hidden" name="match_id" value={challenge.match_id}/><button className={secondaryButtonClass} disabled={starting}>Start kamp</button></form><Link className={buttonClass} href={`/karriere/kamp/${challenge.match_id}`}>Åpne lobby</Link></> : null}</div>; })}{acceptState.error || startState.error ? <p className="text-sm text-danger">{acceptState.error ?? startState.error}</p> : null}</section>;
}
