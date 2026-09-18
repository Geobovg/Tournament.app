"use client";

import { useActionState, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteTournamentAction, removeParticipantAction, renewInviteAction, renameTournamentAction, type ActionState } from "@/lib/actions";
import { addFriendToTournamentAction } from "@/lib/friend-actions";
import { buttonClass, labelClass, secondaryButtonClass } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";

const initialState: ActionState = {};

export function TournamentSettings({ tournamentId, tournamentName, inviteToken, inviteCode, members, friends, registrationOpen }: { tournamentId: string; tournamentName: string; inviteToken: string; inviteCode: string; members: { user_id: string; username: string }[]; friends: { id: string; username: string }[]; registrationOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renameState, renameAction, renaming] = useActionState(renameTournamentAction, initialState);
  const [renewState, renewAction, renewing] = useActionState(renewInviteAction, initialState);
  const [removeState, removeAction, removing] = useActionState(removeParticipantAction, initialState);
  const [addFriendState, addFriendAction, addingFriend] = useActionState(addFriendToTournamentAction, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteTournamentAction, initialState);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const link = `/join/${inviteToken}`;
  const copyLink = async () => {
    const fullLink = new URL(link, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(fullLink);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = fullLink;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const trigger = <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-raised" aria-label="Turneringsinnstillinger">⚙</button>;
  if (!open) return trigger;
  const modal = <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="tournament-settings-title"><div className="mx-auto min-h-full w-full max-w-2xl flex items-start justify-center py-4 sm:py-8"><section className="w-full rounded-xl border border-border bg-surface p-4 shadow-2xl sm:p-6"><div className="flex items-center justify-between gap-4"><h2 id="tournament-settings-title" className="text-lg font-semibold">⚙ Innstillinger</h2><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-raised" aria-label="Lukk innstillinger">Lukk</button></div><div className="mt-5 grid gap-5"><form action={renameAction} className="grid gap-2"><label className={labelClass} htmlFor="tournament-name">Endre navn</label><input type="hidden" name="tournament_id" value={tournamentId} /><input id="tournament-name" name="name" defaultValue={tournamentName} className="w-full" required />{renameState.error ? <p className="text-danger">{renameState.error}</p> : null}<button className={secondaryButtonClass} disabled={renaming}>{renaming ? "Lagrer…" : "Endre navn"}</button></form><div className="grid gap-2"><p className={labelClass}>Del turnering</p><div className="flex flex-col gap-2 sm:flex-row"><input value={link} readOnly className="min-w-0 flex-1" aria-label="Invitasjonslenke" /><button type="button" onClick={copyLink} className={secondaryButtonClass}>{copied ? "Kopiert ✓" : "Kopier"}</button></div><p className="text-sm text-muted">Eller bruk invitasjonskode: <strong className="font-mono text-foreground">{inviteCode}</strong></p><form action={renewAction}><input type="hidden" name="tournament_id" value={tournamentId} />{renewState.error ? <p className="text-danger">{renewState.error}</p> : null}<button className="mt-2 text-sm text-danger underline" disabled={renewing}>Forny lenke</button></form></div>{registrationOpen && friends.length > 0 ? <form action={addFriendAction} className="grid gap-2"><label className={labelClass} htmlFor="friend-id">Legg til venn</label><input type="hidden" name="tournament_id" value={tournamentId} /><select id="friend-id" name="friend_id" className="w-full"><option value="">Velg venn</option>{friends.map((friend) => <option key={friend.id} value={friend.id}>{friend.username}</option>)}</select>{addFriendState.error ? <p className="text-danger">{addFriendState.error}</p> : null}<button className={secondaryButtonClass} disabled={addingFriend}>{addingFriend ? "Legger til…" : "Legg til venn"}</button></form> : null}{registrationOpen ? <form action={removeAction} className="grid gap-2"><label className={labelClass} htmlFor="member-id">Fjern deltaker</label><input type="hidden" name="tournament_id" value={tournamentId} /><select id="member-id" name="member_id" className="w-full"><option value="">Velg deltaker</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.username}</option>)}</select>{removeState.error ? <p className="text-danger">{removeState.error}</p> : null}<button className={buttonClass} disabled={removing}>Fjern deltaker</button></form> : null}<form ref={deleteFormRef} action={deleteAction} className="grid gap-2 border-t border-border pt-5"><input type="hidden" name="tournament_id" value={tournamentId} />{deleteState.error ? <p className="text-danger">{deleteState.error}</p> : null}<button type="button" onClick={() => setConfirmingDelete(true)} className="rounded-lg border border-danger px-4 py-2 font-medium text-danger hover:bg-danger/10" disabled={deleting}>{deleting ? "Sletter…" : "Slett turnering"}</button><p className="text-xs text-muted">Dette kan ikke angres.</p></form></div></section></div></div>;
  return <>{trigger}{open && typeof document !== "undefined" ? createPortal(modal, document.body) : null}{confirmingDelete ? <ConfirmDialog message="Er du sikker på at du vil slette turneringen? Alle lag, deltakere, kamper og videoer i turneringen blir slettet." onCancel={() => setConfirmingDelete(false)} onConfirm={() => { setConfirmingDelete(false); deleteFormRef.current?.requestSubmit(); }} /> : null}</>;
}
