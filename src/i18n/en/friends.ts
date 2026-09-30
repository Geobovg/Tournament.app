export const friends = {
  page: {
    title: "Friends",
    description: "Add friends to make it easier to invite them to tournaments.",
  },
  find: {
    title: "Find friends",
    placeholder: "Search by username",
    search: "Search",
    searching: "Searching…",
    noResults: (query: string) => `No results for "${query}".`,
  },
  status: {
    friends: "You're friends",
    requestSent: "Request sent",
    sentYouRequest: "Sent you a request",
  },
  add: "Add friend",
  sending: "Sending…",
  accept: "Accept",
  accepting: "Accepting…",
  decline: "Decline",
  cancel: "Cancel",
  remove: "Remove friend",
  incomingTitle: "Friend requests",
  outgoingTitle: "Awaiting reply",
  listTitle: "Friends",
  empty: "You don't have any friends yet. Search for a username above to add someone.",
  errors: {
    missingRecipient: "Missing recipient",
    cannotAddSelf: "You can't add yourself",
    userNotFound: "Couldn't find that user",
    alreadyFriends: "You're already friends",
    requestExists: "There's already a friend request between you",
    requestNotFound: "Couldn't find the request",
    ownerOnly: "Only the organiser can add participants",
    registrationClosed: "Sign-ups are closed",
    notFriends: "You're not friends",
  },
};

export type FriendsDict = typeof friends;
