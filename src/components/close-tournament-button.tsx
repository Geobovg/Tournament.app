"use client";

import { useActionState, useState } from "react";
import { closeTournamentAction, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export function CloseTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(closeTournamentAction, initialState);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs text-muted transition hover:bg-surface-raised hover:text-foreground"
      >
        Lukk
      </button>
    );
  }

  return (
    <form action={action} className="flex shrink-0 items-center gap-2">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-danger px-3 py-2 text-xs font-medium text-danger transition hover:bg-surface-raised disabled:opacity-50"
      >
        {pending ? "Lukker…" : "Ja, lukk"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-border px-3 py-2 text-xs text-muted transition hover:bg-surface-raised"
      >
        Avbryt
      </button>
      {state.error ? (
        <span className="text-xs text-danger">{state.error}</span>
      ) : null}
    </form>
  );
}
