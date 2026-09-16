"use client";

import { useActionState } from "react";
import {
  confirmResultAction,
  submitResultAction,
  type ActionState,
} from "@/lib/actions";
import { buttonClass, labelClass, secondaryButtonClass } from "./ui";

const initialState: ActionState = {};

type TeamRef = { id: string; name: string };

export function MatchActions({
  matchId,
  status,
  isNhl,
  showPenalties,
  homeTeam,
  awayTeam,
}: {
  matchId: string;
  status: "scheduled" | "pending_confirmation";
  isNhl: boolean;
  showPenalties: boolean;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
}) {
  const [submitState, submitAction, submitting] = useActionState(
    submitResultAction,
    initialState,
  );
  const [confirmState, confirmAction, confirming] = useActionState(
    confirmResultAction,
    initialState,
  );

  return (
    <div className="grid gap-8">
      {status === "pending_confirmation" ? (
        <form action={confirmAction} className="grid gap-4">
          <input type="hidden" name="match_id" value={matchId} />
          <p className="text-sm text-muted">
            Er resultatet riktig? Motstanderen må bekrefte før det telles.
          </p>
          {confirmState.error ? (
            <p className="text-danger">{confirmState.error}</p>
          ) : null}
          {confirmState.ok ? (
            <p className="text-success">Resultatet er bekreftet!</p>
          ) : null}
          <button type="submit" className={buttonClass} disabled={confirming}>
            {confirming ? "Bekrefter…" : "Bekreft resultatet"}
          </button>
        </form>
      ) : null}

      <form action={submitAction} className="grid gap-4">
        <input type="hidden" name="match_id" value={matchId} />

        <h3 className="font-semibold">
          {status === "pending_confirmation"
            ? "Uenig? Legg inn nytt resultat"
            : "Legg inn resultat"}
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor={`home-${matchId}`}>
              {homeTeam.name}
            </label>
            <input
              id={`home-${matchId}`}
              name="home_score"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
              min={0}
              max={99}
              className="mt-1 w-full"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`away-${matchId}`}>
              {awayTeam.name}
            </label>
            <input
              id={`away-${matchId}`}
              name="away_score"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
              min={0}
              max={99}
              className="mt-1 w-full"
              required
            />
          </div>
        </div>

        {isNhl ? (
          <fieldset>
            <legend className={labelClass}>Hvordan ble kampen avgjort?</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3">
                <input
                  type="radio"
                  name="result_type"
                  value="regulation"
                  defaultChecked
                  className="w-auto"
                />
                <span>Ordinær tid</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3">
                <input
                  type="radio"
                  name="result_type"
                  value="ot_so"
                  className="w-auto"
                />
                <span>Overtime / straffeslagkonkurranse</span>
              </label>
            </div>
          </fieldset>
        ) : null}

        {showPenalties ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className={labelClass}>
                Straffekonkurranse – fyll ut kun hvis duellen står likt
              </p>
            </div>
            <input
              name="penalty_home"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              max={99}
              placeholder={`Straffer ${homeTeam.name}`}
              className="w-full"
            />
            <input
              name="penalty_away"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              max={99}
              placeholder={`Straffer ${awayTeam.name}`}
              className="w-full"
            />
          </div>
        ) : null}

        {submitState.error ? (
          <p className="text-danger">{submitState.error}</p>
        ) : null}
        {submitState.ok ? (
          <p className="text-success">
            Resultatet er sendt inn – motstanderen må bekrefte det.
          </p>
        ) : null}

        <button
          type="submit"
          className={
            status === "pending_confirmation" ? secondaryButtonClass : buttonClass
          }
          disabled={submitting}
        >
          {submitting ? "Sender…" : "Send inn resultat"}
        </button>
      </form>
    </div>
  );
}
