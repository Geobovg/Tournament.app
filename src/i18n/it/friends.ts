export const friends = {
  page: {
    title: "Amici",
    description: "Aggiungi amici per invitarli più facilmente ai tornei.",
  },
  find: {
    title: "Trova amici",
    placeholder: "Cerca per nome utente",
    search: "Cerca",
    searching: "Ricerca…",
    noResults: (query: string) => `Nessun risultato per "${query}".`,
  },
  status: {
    friends: "Siete amici",
    requestSent: "Richiesta inviata",
    sentYouRequest: "Ti ho inviato una richiesta",
  },
  add: "Aggiungi amico",
  sending: "Invio…",
  accept: "Accetta",
  accepting: "Accettazione...",
  decline: "Rifiutare",
  cancel: "Annulla",
  remove: "Rimuovi amico",
  incomingTitle: "Richieste di amicizia",
  outgoingTitle: "In attesa di risposta",
  listTitle: "Amici",
  empty: "Non hai ancora amici. Cerca un nome utente qui sopra per aggiungere qualcuno.",
  errors: {
    missingRecipient: "Destinatario mancante",
    cannotAddSelf: "Non puoi aggiungere te stesso",
    userNotFound: "Impossibile trovare l'utente",
    alreadyFriends: "Siete già amici",
    requestExists: "C'è già una richiesta di amicizia tra di voi",
    requestNotFound: "Impossibile trovare la richiesta",
    ownerOnly: "Solo l'organizzatore può aggiungere partecipanti",
    registrationClosed: "Le iscrizioni sono chiuse",
    notFriends: "Non siete amici",
  },
};

export type FriendsDict = typeof friends;
