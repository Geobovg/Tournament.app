"use client";

import { useActionState } from "react";
import { createTournamentAction, type ActionState } from "@/lib/actions";
import { buttonClass, labelClass } from "./ui";

const initialState: ActionState = {};

export function CreateTournamentForm() {
  const [state, action, pending] = useActionState(
    createTournamentAction,
    initialState,
  );

  return (
    <form action={action} className="grid gap-5">
      <div>
        <label className={labelClass} htmlFor="name">
          Navn på turneringen
        </label>
        <input
          id="name"
          name="name"
          className="mt-1 w-full"
          placeholder="F.eks. Vinterserien 2026"
          required
        />
      </div>

      <fieldset>
        <legend className={labelClass}>Spill</legend>
        <div className="mt-2 flex gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border p-3">
            <input type="radio" name="type" value="fifa" defaultChecked className="w-auto" />
            <span>FIFA</span>
          </label>
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border p-3">
            <input type="radio" name="type" value="nhl" className="w-auto" />
            <span>NHL</span>
          </label>
        </div>
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="max_teams">
          Maks antall lag
        </label>
        <input
          id="max_teams"
          name="max_teams"
          type="number"
          min={2}
          max={128}
          defaultValue={16}
          className="mt-1 w-full"
          required
        />
        <p className="mt-1 text-sm text-muted">
          Påmeldingen kan stenges manuelt før alle plassene er fylt.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="legs">
          Kamper per sluttspillduell
        </label>
        <select id="legs" name="legs" defaultValue="1" className="mt-1 w-full">
          <option value="1">1 kamp</option>
          <option value="2">2 kamper</option>
        </select>
        <p className="mt-1 text-sm text-muted">
          Finalen spilles alltid som én kamp, uansett valg her.
        </p>
      </div>

      {state.error ? <p className="text-danger">{state.error}</p> : null}

      <button type="submit" className={buttonClass} disabled={pending}>
        {pending ? "Oppretter…" : "Opprett turnering"}
      </button>
    </form>
  );
}
