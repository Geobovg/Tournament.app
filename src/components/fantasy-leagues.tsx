"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { useLocale, useT } from "@/i18n/client";
import { createFantasyLeagueAction, deleteFantasyLeagueAction, joinFantasyLeagueAction, leaveFantasyLeagueAction, type FantasyActionResult } from "@/lib/fantasy-actions";
import { INVITE_CODE_LENGTH, validInviteCode } from "@/lib/invite-code";
import { ConfirmDialog } from "./confirm-dialog";
import { buttonClass, secondaryButtonClass } from "./ui";

const inputClass = "min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2";

export function CreateLeagueForm() {
  const text = useT().fantasy.leagues;
  const [state, action, pending] = useActionState<FantasyActionResult, FormData>(createFantasyLeagueAction, {});
  return (
    <form action={action} className="grid gap-2">
      <div className="flex gap-2"><input name="name" maxLength={40} required placeholder={text.namePlaceholder} className={inputClass} /><button disabled={pending} className={buttonClass}>{pending ? text.creating : text.create}</button></div>
      {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
    </form>
  );
}

export function JoinLeagueForm() {
  const text = useT().fantasy.leagues;
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form onSubmit={(event) => { event.preventDefault(); if (validInviteCode(code)) router.push(`/join/fantasy/${code}`); }} className="flex gap-2">
      <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={text.codePlaceholder} maxLength={INVITE_CODE_LENGTH} className={`${inputClass} uppercase`} />
      <button className={secondaryButtonClass}>{text.join}</button>
    </form>
  );
}

export function JoinLeagueButton({ code }: { code: string }) {
  const text = useT().fantasy.join;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await joinFantasyLeagueAction(code); setError(result.error ?? null); })} className={buttonClass}>{pending ? text.joining : text.button}</button>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}

// Invitasjonslenken bygges når den kopieres, så den får riktig domene (localhost eller sendit.website).
export function InviteBox({ code }: { code: string }) {
  const text = useT().fantasy.leagues;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/fantasy/${code}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-2xl font-black tracking-[0.3em]">{code}</p>
      <button type="button" onClick={copy} className={secondaryButtonClass}>{copied ? text.copied : text.copyLink}</button>
    </div>
  );
}

export function LeaveOrDeleteLeague({ leagueId, owner }: { leagueId: string; owner: boolean }) {
  const text = useT().fantasy.leagues;
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = () => startTransition(async () => {
    setConfirming(false);
    const result = owner ? await deleteFantasyLeagueAction(leagueId) : await leaveFantasyLeagueAction(leagueId);
    setError(result.error ?? null);
  });
  return (
    <div className="grid gap-2">
      <button type="button" disabled={pending} onClick={() => setConfirming(true)} className="justify-self-start rounded-lg border border-danger px-3 py-2 text-sm text-danger transition hover:bg-surface-raised disabled:opacity-50">{owner ? text.delete : text.leave}</button>
      {confirming ? <ConfirmDialog message={owner ? text.confirmDelete : text.confirmLeave} onConfirm={run} onCancel={() => setConfirming(false)} /> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}

// Avsparkstid i brukerens egen tidssone. Serveren kan ha en annen tidssone, så teksten får lov
// til å avvike ved første visning (som i SBC-panelet).
export function FixtureTime({ at }: { at: string }) {
  const locale = useLocale();
  let text = at;
  try {
    text = new Intl.DateTimeFormat(locale, { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(at));
  } catch {
    text = at;
  }
  return <span className="text-xs text-muted" suppressHydrationWarning>{text}</span>;
}
