export const friends = {
  page: {
    title: "Amis",
    description: "Ajoutez des amis pour faciliter leur invitation à des tournois.",
  },
  find: {
    title: "Trouver des amis",
    placeholder: "Rechercher par nom d'utilisateur",
    search: "Rechercher",
    searching: "Recherche…",
    noResults: (query: string) => `Aucun résultat pour "${query}".`,
  },
  status: {
    friends: "Vous êtes amis",
    requestSent: "Demande envoyée",
    sentYouRequest: "Je vous ai envoyé une demande",
  },
  add: "Ajouter un ami",
  sending: "Envoi…",
  accept: "Accepter",
  accepting: "Accepter…",
  decline: "Refuser",
  cancel: "Annuler",
  remove: "Supprimer un ami",
  incomingTitle: "Demandes d'amis",
  outgoingTitle: "En attente de réponse",
  listTitle: "Amis",
  empty: "Vous n'avez pas encore d'amis. Recherchez un nom d'utilisateur ci-dessus pour ajouter quelqu'un.",
  errors: {
    missingRecipient: "Destinataire manquant",
    cannotAddSelf: "Vous ne pouvez pas vous ajouter",
    userNotFound: "Impossible de trouver cet utilisateur",
    alreadyFriends: "Vous êtes déjà amis",
    requestExists: "Il y a déjà une demande d'amitié entre vous",
    requestNotFound: "Je n'ai pas trouvé la demande",
    ownerOnly: "Seul l'organisateur peut ajouter des participants",
    registrationClosed: "Les inscriptions sont closes",
    notFriends: "Vous n'êtes pas amis",
  },
};

export type FriendsDict = typeof friends;
