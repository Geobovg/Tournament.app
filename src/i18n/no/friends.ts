import type { FriendsDict } from "../en/friends";

// Vennesiden og venneforespørsler.
export const friends: FriendsDict = {
  page: {
    title: "Venner",
    description: "Legg til venner for å enklere invitere dem til turneringer.",
  },
  find: {
    title: "Finn venner",
    placeholder: "Søk på brukernavn",
    search: "Søk",
    searching: "Søker…",
    noResults: (query: string) => `Ingen treff på "${query}".`,
  },
  status: {
    friends: "Dere er venner",
    requestSent: "Forespørsel sendt",
    sentYouRequest: "Har sendt deg en forespørsel",
  },
  add: "Legg til venn",
  sending: "Sender…",
  accept: "Godta",
  accepting: "Godtar…",
  decline: "Avslå",
  cancel: "Avbryt",
  remove: "Fjern venn",
  incomingTitle: "Venneforespørsler",
  outgoingTitle: "Venter på svar",
  listTitle: "Venner",
  empty: "Du har ingen venner ennå. Søk etter brukernavn over for å legge til.",
  errors: {
    missingRecipient: "Mangler mottaker",
    cannotAddSelf: "Du kan ikke legge til deg selv",
    userNotFound: "Fant ikke brukeren",
    alreadyFriends: "Dere er allerede venner",
    requestExists: "Det finnes allerede en venneforespørsel mellom dere",
    requestNotFound: "Fant ikke forespørselen",
    ownerOnly: "Bare arrangøren kan legge til deltakere",
    registrationClosed: "Påmeldingen er stengt",
    notFriends: "Dere er ikke venner",
  },
};

