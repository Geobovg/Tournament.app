"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import {
  chooseTeamAction,
  joinTournamentAction,
  leaveTournamentAction,
  lockRegistrationAction,
  setTeamNameAction,
  type ActionState,
} from "@/lib/actions";
import { buttonClass, labelClass, secondaryButtonClass } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useT } from "@/i18n/client";

const initialState: ActionState = {};

type Slot = { id: string; name: string | null; members: { username: string }[] };

export function JoinTournamentForm({ tournamentId, inviteToken }: { tournamentId: string; inviteToken: string }) {
  const [state, action, pending] = useActionState(joinTournamentAction, initialState);
  const t = useT().auth.join;
  return <form action={action} className="grid gap-3"><input type="hidden" name="tournament_id" value={tournamentId} /><input type="hidden" name="invite_token" value={inviteToken} /><p className="text-muted">{t.question}</p>{state.error ? <p className="text-danger">{state.error}</p> : null}<div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={pending}>{pending ? t.accepting : t.accept}</button><Link href="/turneringer" className={secondaryButtonClass}>{t.decline}</Link></div></form>;
}

export function TeamPicker({ tournamentId, teamSize, slots, myTeamId, joined }: { tournamentId: string; teamSize: number; slots: Slot[]; myTeamId: string | null; joined: boolean }) {
  const [chooseState, chooseAction, choosing] = useActionState(chooseTeamAction, initialState);
  const [nameState, nameAction, naming] = useActionState(setTeamNameAction, initialState);
  const [leaveState, leaveAction, leaving] = useActionState(leaveTournamentAction, initialState);
  const mySlot = slots.find((slot) => slot.id === myTeamId);
  const t = useT().auth.teamPicker;
  if (!joined) return <p className="text-muted">{t.joinFirst}</p>;
  if (mySlot?.name) return <div className="grid gap-2"><p className="font-medium">{t.onTeam(mySlot.name)}</p><p className="text-sm text-muted">{t.teammateSync}</p></div>;
  if (myTeamId) {
    const full = mySlot?.members.length === teamSize;
    return <div className="grid gap-4"><p className="font-medium">{t.onTeamNumber(slots.findIndex((slot) => slot.id === myTeamId) + 1, mySlot?.members.length ?? 0, teamSize)}</p>{full ? <form action={nameAction} className="grid gap-3"><input type="hidden" name="tournament_id" value={tournamentId} /><div><label className={labelClass} htmlFor="team-name">{t.chooseName}</label><input id="team-name" name="name" className="mt-1 w-full" required /></div>{nameState.error ? <p className="text-danger">{nameState.error}</p> : null}<button className={buttonClass} disabled={naming}>{naming ? t.saving : t.confirmName}</button></form> : <p className="text-muted">{t.waitingForTeammate}</p>}<form action={leaveAction}><input type="hidden" name="tournament_id" value={tournamentId} />{leaveState.error ? <p className="mb-2 text-danger">{leaveState.error}</p> : null}<button className="text-sm text-danger underline" disabled={leaving}>{t.leave}</button></form></div>;
  }
  return <div className="grid gap-4"><p className="text-muted">{t.chooseTeam}</p><form action={chooseAction} className="grid gap-2"><input type="hidden" name="tournament_id" value={tournamentId} />{slots.filter((slot) => slot.members.length < teamSize).map((slot) => <button key={slot.id} name="team_id" value={slot.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-left transition hover:bg-surface-raised" disabled={choosing}><span>{t.team(slots.indexOf(slot) + 1)}</span><span className="text-sm text-muted">{slot.members.length}/{teamSize}</span></button>)}{chooseState.error ? <p className="text-danger">{chooseState.error}</p> : null}</form></div>;
}

export function LockRegistrationForm({ tournamentId, ready }: { tournamentId: string; ready: boolean }) {
  const [state, action, pending] = useActionState(lockRegistrationAction, initialState);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().auth.lockRegistration;
  return <><form ref={formRef} action={action} className="grid gap-3"><input type="hidden" name="tournament_id" value={tournamentId} />{state.error ? <p className="text-danger">{state.error}</p> : null}<button type="button" onClick={() => setConfirming(true)} className={secondaryButtonClass} disabled={pending}>{pending ? t.starting : t.start}</button>{!ready ? <p className="text-sm text-muted">{t.notFullHint}</p> : null}</form>{confirming ? <ConfirmDialog message={t.confirm} onCancel={() => setConfirming(false)} onConfirm={() => { setConfirming(false); formRef.current?.requestSubmit(); }} /> : null}</>;
}
