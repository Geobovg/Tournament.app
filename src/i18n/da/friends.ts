export const friends = {
  page: {
    title: "Venner",
    description: "Tilføj venner for at gøre det nemmere at invitere dem til turneringer.",
  },
  find: {
    title: "Find venner",
    placeholder: "Søg efter brugernavn",
    search: "Søg",
    searching: "Søger...",
    noResults: (query: string) => `Ingen resultater for "${query}".`,
  },
  status: {
    friends: "I er venner",
    requestSent: "Forespørgsel sendt",
    sentYouRequest: "Har sendt dig en anmodning",
  },
  add: "Tilføj ven",
  sending: "Sender...",
  accept: "Accepter",
  accepting: "Accepterer...",
  decline: "Afslå",
  cancel: "Annuller",
  remove: "Fjern ven",
  incomingTitle: "Venneanmodninger",
  outgoingTitle: "Afventer svar",
  listTitle: "Venner",
  empty: "Du har ingen venner endnu. Søg efter et brugernavn ovenfor for at tilføje nogen.",
  errors: {
    missingRecipient: "Manglende modtager",
    cannotAddSelf: "Du kan ikke tilføje dig selv",
    userNotFound: "Kunne ikke finde den bruger",
    alreadyFriends: "I er allerede venner",
    requestExists: "Der er allerede en venneanmodning mellem jer",
    requestNotFound: "Kunne ikke finde anmodningen",
    ownerOnly: "Kun arrangøren kan tilføje deltagere",
    registrationClosed: "Tilmeldinger er lukket",
    notFriends: "I er ikke venner",
  },
};

export type FriendsDict = typeof friends;
