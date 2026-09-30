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
import { useT } from "@/i18n/client";
import { buttonClass, cardClass, secondaryButtonClass } from "./ui";

const initialAction: ActionState = {};
const initialSearch: SearchState = { query: "", results: [] };

function AddFriendButton({ recipientId }: { recipientId: string }) {
  const [state, action, pending] = useActionState(sendFriendRequestAction, initialAction);
  const t = useT().friends;
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="recipient_id" value={recipientId} />
      <button className={secondaryButtonClass} disabled={pending}>{pending ? t.sending : t.add}</button>
      {state.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </form>
  );
}

function RequestRow({ request, mode }: { request: PendingRequest; mode: "incoming" | "outgoing" }) {
  const [acceptState, acceptAction, accepting] = useActionState(acceptFriendRequestAction, initialAction);
  const [removeState, removeAction, removing] = useActionState(removeFriendRequestAction, initialAction);
  const t = useT().friends;
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <span className="font-medium">{request.user.username}</span>
      <div className="flex items-center gap-2">
        {mode === "incoming" ? (
          <form action={acceptAction}>
            <input type="hidden" name="request_id" value={request.id} />
            <button className={buttonClass} disabled={accepting}>{accepting ? t.accepting : t.accept}</button>
          </form>
        ) : null}
        <form action={removeAction}>
          <input type="hidden" name="request_id" value={request.id} />
          <button className={secondaryButtonClass} disabled={removing}>
            {removing ? "…" : mode === "incoming" ? t.decline : t.cancel}
          </button>
        </form>
        {acceptState.error || removeState.error ? <span className="text-xs text-danger">{acceptState.error ?? removeState.error}</span> : null}
      </div>
    </li>
  );
}

function FriendRow({ friend }: { friend: Friend }) {
  const [state, action, pending] = useActionState(removeFriendRequestAction, initialAction);
  const t = useT().friends;
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <span className="font-medium">{friend.username}</span>
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="request_id" value={friend.requestId} />
        <button className={secondaryButtonClass} disabled={pending}>{pending ? "…" : t.remove}</button>
        {state.error ? <span className="text-xs text-danger">{state.error}</span> : null}
      </form>
    </li>
  );
}

function SearchResultRow({ result, status }: { result: ProfileLike; status: "friends" | "outgoing" | "incoming" | "none" }) {
  const t = useT().friends;
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <span className="font-medium">{result.username}</span>
      {status === "friends" ? <span className="text-sm text-muted">{t.status.friends}</span>
        : status === "outgoing" ? <span className="text-sm text-muted">{t.status.requestSent}</span>
        : status === "incoming" ? <span className="text-sm text-muted">{t.status.sentYouRequest}</span>
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
  const t = useT().friends;

  return (
    <div className="grid gap-6">
      <section className={`${cardClass} grid gap-4`}>
        <h2 className="text-lg font-semibold">{t.find.title}</h2>
        <form action={searchAction} className="flex gap-2">
          <input name="query" placeholder={t.find.placeholder} defaultValue={searchState.query} className="min-w-0 flex-1" />
          <button className={secondaryButtonClass} disabled={searching}>{searching ? t.find.searching : t.find.search}</button>
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
          <p className="text-sm text-muted">{t.find.noResults(searchState.query)}</p>
        ) : null}
      </section>

      {incoming.length > 0 ? (
        <section className={`${cardClass} grid gap-3`}>
          <h2 className="text-lg font-semibold">{t.incomingTitle}</h2>
          <ul className="grid gap-2">
            {incoming.map((request) => <RequestRow key={request.id} request={request} mode="incoming" />)}
          </ul>
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section className={`${cardClass} grid gap-3`}>
          <h2 className="text-lg font-semibold">{t.outgoingTitle}</h2>
          <ul className="grid gap-2">
            {outgoing.map((request) => <RequestRow key={request.id} request={request} mode="outgoing" />)}
          </ul>
        </section>
      ) : null}

      <section className={`${cardClass} grid gap-3`}>
        <h2 className="text-lg font-semibold">{t.listTitle}</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-muted">{t.empty}</p>
        ) : (
          <ul className="grid gap-2">
            {friends.map((friend) => <FriendRow key={friend.requestId} friend={friend} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
