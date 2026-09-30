export const friends = {
  page: {
    title: "Vänner",
    description: "Lägg till vänner för att göra det enklare att bjuda in dem till turneringar.",
  },
  find: {
    title: "Hitta vänner",
    placeholder: "Sök efter användarnamn",
    search: "Sök",
    searching: "Söker...",
    noResults: (query: string) => `Inga resultat för "${query}".`,
  },
  status: {
    friends: "Ni är vänner",
    requestSent: "Begäran har skickats",
    sentYouRequest: "Skickade en förfrågan till dig",
  },
  add: "Lägg till vän",
  sending: "Skickar...",
  accept: "Acceptera",
  accepting: "Accepterar...",
  decline: "Avböja",
  cancel: "Avbryt",
  remove: "Ta bort vän",
  incomingTitle: "Vänförfrågningar",
  outgoingTitle: "Väntar på svar",
  listTitle: "Vänner",
  empty: "Du har inga vänner än. Sök efter ett användarnamn ovan för att lägga till någon.",
  errors: {
    missingRecipient: "Saknar mottagare",
    cannotAddSelf: "Du kan inte lägga till dig själv",
    userNotFound: "Kunde inte hitta den användaren",
    alreadyFriends: "Ni är redan vänner",
    requestExists: "Det finns redan en vänförfrågan mellan er",
    requestNotFound: "Kunde inte hitta begäran",
    ownerOnly: "Endast arrangören kan lägga till deltagare",
    registrationClosed: "Anmälningar är stängda",
    notFriends: "Ni är inte vänner",
  },
};

export type FriendsDict = typeof friends;
