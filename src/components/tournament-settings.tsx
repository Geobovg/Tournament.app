"use client";

import { useActionState, useState } from "react";
import { removeParticipantAction, renewInviteAction, renameTournamentAction, type ActionState } from "@/lib/actions";
import { buttonClass, labelClass, secondaryButtonClass } from "./ui";

const initialState: ActionState = {};

export function TournamentSettings({ tournamentId, tournamentName, inviteToken, inviteCode, members, registrationOpen }: { tournamentId: string; tournamentName: string; inviteToken: string; inviteCode: string; members: { user_id: string; username: string }[]; registrationOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const [renameState, renameAction, renaming] = useActionState(renameTournamentAction, initialState);
  const [renewState, renewAction, renewing] = useActionState(renewInviteAction, initialState);
  const [removeState, removeAction, removing] = useActionState(removeParticipantAction, initialState);
  const link = `/join/${inviteToken}`;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-raised" aria-label="Turneringsinnstillinger">⚙</button>;
  return <details open className="relative rounded-lg border border-border bg-surface p-4"><summary className="cursor-pointer font-medium">⚙ Innstillinger</summary><div className="mt-4 grid gap-5"><form action={renameAction} className="grid gap-2"><label className={labelClass} htmlFor="tournament-name">Endre navn</label><input type="hidden" name="tournament_id" value={tournamentId} /><input id="tournament-name" name="name" defaultValue={tournamentName} className="w-full" required />{renameState.error ? <p className="text-danger">{renameState.error}</p> : null}<button className={secondaryButtonClass} disabled={renaming}>{renaming ? "Lagrer…" : "Endre navn"}</button></form><div className="grid gap-2"><p className={labelClass}>Del turnering</p><div className="flex gap-2"><input value={link} readOnly className="min-w-0 flex-1" /><button type="button" onClick={() => navigator.clipboard.writeText(new URL(link, window.location.origin).href)} className={secondaryButtonClass}>Kopier</button></div><p className="text-sm text-muted">Eller bruk invitasjonskode: <strong className="font-mono text-foreground">{inviteCode}</strong></p><form action={renewAction}><input type="hidden" name="tournament_id" value={tournamentId} />{renewState.error ? <p className="text-danger">{renewState.error}</p> : null}<button className="mt-2 text-sm text-danger underline" disabled={renewing}>Forny lenke</button></form></div>{registrationOpen ? <form action={removeAction} className="grid gap-2"><label className={labelClass} htmlFor="member-id">Fjern deltaker</label><input type="hidden" name="tournament_id" value={tournamentId} /><select id="member-id" name="member_id" className="w-full"><option value="">Velg deltaker</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.username}</option>)}</select>{removeState.error ? <p className="text-danger">{removeState.error}</p> : null}<button className={buttonClass} disabled={removing}>Fjern deltaker</button></form> : null}</div></details>;
}
