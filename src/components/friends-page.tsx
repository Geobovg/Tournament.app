"use client";

import { useActionState } from "react";
import {
  acceptFriendRequestAction,
  removeFriendRequestAction,
  searchUsersAction,
  sendFriendRequestAction,
  type SearchState,
} from "@/lib/friend-actions";
import type { ActionState } from "@/lib/actions";
import type { Friend, PendingRequest, ProfileLike } from "@/lib/friends";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";

const initialAction: ActionState = {};
const initialSearch: SearchState = { query: "", results: [] };

function AddFriendButton({ recipientId }: { recipientId: string }) {
  const [state, action, pending] = useActionState(sendFriendRequestAction, initialAction);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="recipient_id" value={recipientId} />
      <button className={secondaryButtonClass} disabled={pending}>{pending ? "Sender…" : "Legg til venn"}</button>
      {state.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </form>
  );
}

function RequestRow({ request, mode }: { request: PendingRequest; mode: "incoming" | "outgoing" }) {
  const [acceptState, acceptAction, accepting] = useActionState(acceptFriendRequestAction, initialAction);
  const [removeState, removeAction, removing] = useActionState(removeFriendRequestAction, initialAction);
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <span className="font-medium">{request.user.username}</span>
      <div className="flex items-center gap-2">
        {mode === "incoming" ? (
          <form action={acceptAction}>
            <input type="hidden" name="request_id" value={request.id} />
            <button className={buttonClass} disabled={accepting}>{accepting ? "Godtar…" : "Godta"}</button>
          </form>
        ) : null}
        <form action={removeAction}>
          <input type="hidden" name="request_id" value={request.id} />
          <button className={secondaryButtonClass} disabled={removing}>
            {removing ? "…" : mode === "incoming" ? "Avslå" : "Avbryt"}
          </button>
        </form>
        {acceptState.error || removeState.error ? <span className="text-xs text-danger">{acceptState.error ?? removeState.error}</span> : null}
      </div>
    </li>
  );
}

function FriendRow({ friend }: { friend: Friend }) {
  const [state, action, pending] = useActionState(removeFriendRequestAction, initialAction);
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <span className="font-medium">{friend.username}</span>
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="request_id" value={friend.requestId} />
        <button className={secondaryButtonClass} disabled={pending}>{pending ? "…" : "Fjern venn"}</button>
        {state.error ? <span className="text-xs text-danger">{state.error}</span> : null}
      </form>
    </li>
  );
}

function SearchResultRow({ result, status }: { result: ProfileLike; status: "friends" | "outgoing" | "incoming" | "none" }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <span className="font-medium">{result.username}</span>
      {status === "friends" ? <span className="text-sm text-muted">Dere er venner</span>
        : status === "outgoing" ? <span className="text-sm text-muted">Forespørsel sendt</span>
        : status === "incoming" ? <span className="text-sm text-muted">Har sendt deg en forespørsel</span>
        : <AddFriendButton recipientId={result.id} />}
    </li>
  );
}

export function FriendsPage({
  friends,
  incoming,
  outgoing,
}: {
  friends: Friend[];
  incoming: PendingRequest[];
  outgoing: PendingRequest[];
}) {
  const [searchState, searchAction, searching] = useActionState(searchUsersAction, initialSearch);
  const friendIds = new Set(friends.map((friend) => friend.id));
  const outgoingIds = new Set(outgoing.map((request) => request.user.id));
  const incomingIds = new Set(incoming.map((request) => request.user.id));

  return (
    <div className="grid gap-6">
      <section className={`${cardClass} grid gap-4`}>
        <h2 className="text-lg font-semibold">Finn venner</h2>
        <form action={searchAction} className="flex gap-2">
          <input name="query" placeholder="Søk på brukernavn" defaultValue={searchState.query} className="min-w-0 flex-1" />
          <button className={secondaryButtonClass} disabled={searching}>{searching ? "Søker…" : "Søk"}</button>
        </form>
        {searchState.results.length > 0 ? (
          <ul className="grid gap-2">
            {searchState.results.map((result) => (
              <SearchResultRow
                key={result.id}
                result={result}
                status={friendIds.has(result.id) ? "friends" : outgoingIds.has(result.id) ? "outgoing" : incomingIds.has(result.id) ? "incoming" : "none"}
              />
            ))}
          </ul>
        ) : searchState.query.length >= 2 ? (
          <p className="text-sm text-muted">Ingen treff på &quot;{searchState.query}&quot;.</p>
        ) : null}
      </section>

      {incoming.length > 0 ? (
        <section className={`${cardClass} grid gap-3`}>
          <h2 className="text-lg font-semibold">Venneforespørsler</h2>
          <ul className="grid gap-2">
            {incoming.map((request) => <RequestRow key={request.id} request={request} mode="incoming" />)}
          </ul>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section className={`${cardClass} grid gap-3`}>
          <h2 className="text-lg font-semibold">Venter på svar</h2>
          <ul className="grid gap-2">
            {outgoing.map((request) => <RequestRow key={request.id} request={request} mode="outgoing" />)}
          </ul>
        </section>
      ) : null}

      <section className={`${cardClass} grid gap-3`}>
        <h2 className="text-lg font-semibold">Venner</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-muted">Du har ingen venner ennå. Søk etter brukernavn over for å legge til.</p>
        ) : (
          <ul className="grid gap-2">
            {friends.map((friend) => <FriendRow key={friend.requestId} friend={friend} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
