"use client";

import { useActionState, useState } from "react";
import { createTournamentAction, type ActionState } from "@/lib/actions";
import { tournamentThemes } from "@/lib/theme";
import type { TournamentType } from "@/lib/tournament/types";
import { ThemeBackdrop } from "./tournament-theme";
import { buttonClass, cardClass, labelClass } from "./ui";

const initialState: ActionState = {};

const typeOptions: { value: TournamentType; label: string }[] = [
  { value: "fifa", label: "FIFA" },
  { value: "nhl", label: "NHL" },
];

export function CreateTournamentForm() {
  const [state, action, pending] = useActionState(
    createTournamentAction,
    initialState,
  );
  const [type, setType] = useState<TournamentType>("fifa");

  return (
    <div data-theme={type}>
      <ThemeBackdrop />
      <form action={action} className={`${cardClass} grid gap-5`}>
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
            {typeOptions.map((option) => (
              <label
                key={option.value}
                data-theme={option.value}
                className={`theme-tile flex flex-1 cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  type === option.value
                    ? "border-accent bg-accent-soft"
                    : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={type === option.value}
                  onChange={() => setType(option.value)}
                  className="w-auto"
                />
                <span className="relative text-xl">
                  {tournamentThemes[option.value].emoji}
                </span>
                <span className="relative font-medium">{option.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">
            {tournamentThemes[type].tagline}
          </p>
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
    </div>
  );
}
