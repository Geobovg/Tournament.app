"use client";

import { useActionState } from "react";
import { submitClipAction, type ActionState } from "@/lib/actions";
import { TeamAuthFields, useTeamSession } from "./team-auth-fields";
import { labelClass, secondaryButtonClass } from "./ui";

const initialState: ActionState = {};

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

      <button type="submit" className={secondaryButtonClass} disabled={pending}>
        {pending ? "Lagrer…" : "Legg inn målvideo"}
      </button>
    </form>
  );
}
