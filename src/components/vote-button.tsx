"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { voteAction, type ActionState } from "@/lib/actions";
import { buttonClass, secondaryButtonClass } from "./ui";

const initialState: ActionState = {};

export function VoteButton({
  clipId,
  isMyVote,
}: {
  clipId: string;
  isMyVote: boolean;
}) {
  const [state, action, pending] = useActionState(voteAction, initialState);
  const text = useT().tournaments.voting;

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="clip_id" value={clipId} />
      <button
        type="submit"
        className={isMyVote ? buttonClass : secondaryButtonClass}
        disabled={pending}
      >
        {pending ? text.voting : isMyVote ? text.myVote : text.vote}
      </button>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
