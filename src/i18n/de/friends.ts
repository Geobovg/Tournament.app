export const friends = {
  page: {
    title: "Freunde",
    description: "Fügen Sie Freunde hinzu, um es einfacher zu machen, sie zu Turnieren einzuladen.",
  },
  find: {
    title: "Finde Freunde",
    placeholder: "Suche nach Benutzername",
    search: "Suchen",
    searching: "Suche...",
    noResults: (query: string) => `Keine Ergebnisse für „${query}“.`,
  },
  status: {
    friends: "Ihr seid Freunde",
    requestSent: "Anfrage gesendet",
    sentYouRequest: "Habe Ihnen eine Anfrage geschickt",
  },
  add: "Freund hinzufügen",
  sending: "Senden…",
  accept: "Akzeptiere",
  accepting: "Akzeptieren…",
  decline: "Ablehnen",
  cancel: "Abbrechen",
  remove: "Freund entfernen",
  incomingTitle: "Freundschaftsanfragen",
  outgoingTitle: "Warte auf Antwort",
  listTitle: "Freunde",
  empty: "Du hast noch keine Freunde. Suchen Sie oben nach einem Benutzernamen, um jemanden hinzuzufügen.",
  errors: {
    missingRecipient: "Fehlender Empfänger",
    cannotAddSelf: "Sie können sich nicht selbst hinzufügen",
    userNotFound: "Dieser Benutzer konnte nicht gefunden werden",
    alreadyFriends: "Ihr seid bereits Freunde",
    requestExists: "Es besteht bereits eine Freundschaftsanfrage zwischen euch",
    requestNotFound: "Die Anfrage konnte nicht gefunden werden",
    ownerOnly: "Nur der Organisator kann Teilnehmer hinzufügen",
    registrationClosed: "Anmeldungen sind geschlossen",
    notFriends: "Ihr seid keine Freunde",
  },
};

export type FriendsDict = typeof friends;
