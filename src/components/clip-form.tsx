"use client";

import { useActionState, useSyncExternalStore } from "react";
import { submitClipAction, type ActionState } from "@/lib/actions";
import { TeamAuthFields, useTeamSession } from "./team-auth-fields";
import { labelClass, secondaryButtonClass } from "./ui";

const initialState: ActionState = {};

const skipKey = (matchId: string) => `futebol_skip_clip_${matchId}`;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readSkip(matchId: string) {
  try {
    return localStorage.getItem(skipKey(matchId)) === "1";
  } catch {
    return false;
  }
}

function writeSkip(matchId: string, skip: boolean) {
  try {
    if (skip) localStorage.setItem(skipKey(matchId), "1");
    else localStorage.removeItem(skipKey(matchId));
  } catch {
    // Blokkert lagring betyr bare at valget ikke huskes til neste gang.
  }
  for (const notify of listeners) notify();
}

export function ClipForm({
  tournamentId,
  matchId,
  teams,
}: {
  tournamentId: string;
  matchId: string;
  teams: { id: string; name: string }[];
}) {
  const session = useTeamSession(tournamentId);
  const [state, action, pending] = useActionState(submitClipAction, initialState);
  const skipped = useSyncExternalStore(
    subscribe,
    () => readSkip(matchId),
    () => false,
  );

  if (skipped) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
        <p className="text-sm text-muted">Ingen bangers denne kampen.</p>
        <button
          type="button"
          onClick={() => writeSkip(matchId, false)}
          className="text-sm text-accent underline"
        >
          Legg inn målvideo likevel
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="match_id" value={matchId} />

      <div>
        <label className={labelClass} htmlFor={`clip-${matchId}`}>
          Lenke til målvideo (YouTube o.l.)
        </label>
        <input
          id={`clip-${matchId}`}
          name="video_url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=…"
          className="mt-1 w-full"
          required
        />
        <p className="mt-1 text-sm text-muted">
          Maks ett klipp per lag per kamp – en ny lenke erstatter den forrige.
        </p>
      </div>

      <TeamAuthFields
        idPrefix={`clip-${matchId}`}
        teams={teams}
        session={session}
      />

      {state.error ? <p className="text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-success">Målvideoen er lagt inn!</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={secondaryButtonClass} disabled={pending}>
          {pending ? "Lagrer…" : "Legg inn målvideo"}
        </button>
        <button
          type="button"
          onClick={() => writeSkip(matchId, true)}
          className={secondaryButtonClass}
        >
          Ingen bangers - Skip
        </button>
      </div>
    </form>
  );
}
