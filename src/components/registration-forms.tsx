"use client";

import { useActionState } from "react";
import {
  lockRegistrationAction,
  registerTeamAction,
  type ActionState,
} from "@/lib/actions";
import { buttonClass, labelClass, secondaryButtonClass } from "./ui";

const initialState: ActionState = {};

export function RegisterTeamForm({ tournamentId }: { tournamentId: string }) {
  const [state, action, pending] = useActionState(
    registerTeamAction,
    initialState,
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <div>
        <label className={labelClass} htmlFor="team-name">
          Lagnavn
        </label>
        <input id="team-name" name="name" className="mt-1 w-full" required />
      </div>

      <div>
        <label className={labelClass} htmlFor="team-pin">
          Velg en 4-sifret PIN-kode
        </label>
        <input
          id="team-pin"
          name="pin"
          inputMode="numeric"
          maxLength={4}
          className="mt-1 w-full"
          placeholder="F.eks. 1234"
          required
        />
        <p className="mt-1 text-sm text-muted">
          Koden trengs for å legge inn og bekrefte resultater for laget ditt.
        </p>
      </div>

      {state.error ? <p className="text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-success">Laget er påmeldt!</p> : null}

      <button type="submit" className={buttonClass} disabled={pending}>
        {pending ? "Melder på…" : "Meld på lag"}
      </button>
    </form>
  );
}

export function LockRegistrationForm({
  tournamentId,
  teamCount,
}: {
  tournamentId: string;
  teamCount: number;
}) {
  const [state, action, pending] = useActionState(
    lockRegistrationAction,
    initialState,
  );

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Stenge påmeldingen med ${teamCount} lag og generere kampoppsettet? Dette kan ikke angres.`,
        );
        if (!confirmed) event.preventDefault();
      }}
      className="grid gap-3"
    >
      <input type="hidden" name="tournament_id" value={tournamentId} />
      {state.error ? <p className="text-danger">{state.error}</p> : null}
      <button
        type="submit"
        className={secondaryButtonClass}
        disabled={pending || teamCount < 2}
      >
        {pending ? "Genererer…" : "Steng påmelding og generer kampoppsett"}
      </button>
    </form>
  );
}
