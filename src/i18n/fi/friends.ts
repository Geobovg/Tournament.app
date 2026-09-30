export const friends = {
  page: {
    title: "Ystävät",
    description: "Lisää ystäviä helpottaaksesi heidän kutsumista turnauksiin.",
  },
  find: {
    title: "Etsi ystäviä",
    placeholder: "Hae käyttäjänimellä",
    search: "Etsi",
    searching: "Haetaan…",
    noResults: (query: string) => `Ei tuloksia haulle "${query}".`,
  },
  status: {
    friends: "Olette ystäviä",
    requestSent: "Pyyntö lähetetty",
    sentYouRequest: "Lähetti sinulle pyynnön",
  },
  add: "Lisää ystävä",
  sending: "Lähetetään…",
  accept: "Hyväksy",
  accepting: "Hyväksytään…",
  decline: "Hylkää",
  cancel: "Peruuta",
  remove: "Poista ystävä",
  incomingTitle: "Ystäväpyynnöt",
  outgoingTitle: "Odotetaan vastausta",
  listTitle: "Ystävät",
  empty: "Sinulla ei ole vielä ystäviä. Hae yllä olevaa käyttäjänimeä lisätäksesi henkilön.",
  errors: {
    missingRecipient: "Puuttuva vastaanottaja",
    cannotAddSelf: "Et voi lisätä itseäsi",
    userNotFound: "Käyttäjää ei löytynyt",
    alreadyFriends: "Olette jo ystäviä",
    requestExists: "Välillänne on jo kaveripyyntö",
    requestNotFound: "Pyyntöä ei löytynyt",
    ownerOnly: "Vain järjestäjä voi lisätä osallistujia",
    registrationClosed: "Ilmoittautuminen on suljettu",
    notFriends: "Ette ole ystäviä",
  },
};

export type FriendsDict = typeof friends;
