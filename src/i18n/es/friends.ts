export const friends = {
  page: {
    title: "Amigos",
    description: "Agrega amigos para que sea más fácil invitarlos a torneos.",
  },
  find: {
    title: "encontrar amigos",
    placeholder: "Buscar por nombre de usuario",
    search: "Buscar",
    searching: "Buscando…",
    noResults: (query: string) => `No hay resultados para "${query}".`,
  },
  status: {
    friends: "ustedes son amigos",
    requestSent: "Solicitud enviada",
    sentYouRequest: "Te envié una solicitud",
  },
  add: "Agregar amigo",
  sending: "Enviando…",
  accept: "Aceptar",
  accepting: "Aceptando…",
  decline: "Rechazar",
  cancel: "Cancelar",
  remove: "Eliminar amigo",
  incomingTitle: "Solicitudes de amistad",
  outgoingTitle: "esperando respuesta",
  listTitle: "Amigos",
  empty: "Aún no tienes amigos. Busque un nombre de usuario arriba para agregar a alguien.",
  errors: {
    missingRecipient: "Destinatario faltante",
    cannotAddSelf: "No puedes agregarte",
    userNotFound: "No se pudo encontrar ese usuario",
    alreadyFriends: "ya sois amigos",
    requestExists: "Ya hay una solicitud de amistad entre ustedes.",
    requestNotFound: "No se pudo encontrar la solicitud",
    ownerOnly: "Sólo el organizador puede agregar participantes.",
    registrationClosed: "Las inscripciones están cerradas",
    notFriends: "no sois amigos",
  },
};

export type FriendsDict = typeof friends;
