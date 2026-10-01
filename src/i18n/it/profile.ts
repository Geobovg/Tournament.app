export const profile = {
  page: {
    title: "Profilo",
    description: "Visualizza la tua cronologia e mantieni aggiornato il tuo account.",
    accountAndSecurity: "Conto e sicurezza",
  },
  avatar: {
    title: "Immagine del profilo",
    newAlt: "Nuova immagine del profilo",
    alt: "Immagine del profilo",
    resizeHint: (size: number) => `L'immagine viene ridotta a ${size} px nel browser prima del caricamento, quindi le foto direttamente dalla fotocamera del telefono funzionano correttamente.`,
    readFailed: "Impossibile leggere l'immagine. Provane uno diverso.",
    noCanvas: "Nessuna superficie di disegno disponibile",
    compressFailed: "Impossibile comprimere l'immagine",
    processing: "Elaborazione immagine…",
    uploading: "Caricamento…",
    upload: "Carica",
  },
  username: {
    title: "Nome utente",
    newUsername: "Nuovo nome utente",
    code: "Codice a sei cifre",
    save: "Salva nome utente",
    saving: "Salvataggio…",
  },
  passkey: {
    title: "ID viso/passkey",
    description: "Configura Face ID sul tuo iPhone o una passkey su questo dispositivo per un accesso più rapido.",
  },
  deleteAccount: {
    title: "Elimina account",
    description: "I tornei terminati vengono mantenuti in forma anonima. I tornei attivi devono essere prima chiusi, cancellati o consegnati.",
    codePlaceholder: "Codice a sei cifre",
    submit: "Elimina account",
    deleting: "Eliminazione…",
  },
  errors: {
    invalidUsername: "Nome utente non valido",
    wrongCodeForUsername: "Inserisci il codice corretto a sei cifre per modificare il tuo nome utente",
    usernameTaken: "Quel nome utente è già occupato",
    chooseImage: "Scegli prima un'immagine",
    imageFormat: "L'immagine deve essere JPG, PNG o WebP e non più grande di 2 MB",
    wrongCodeForDelete: "Inserisci il codice corretto a sei cifre per eliminare il tuo account",
    activeTournaments: "Chiudi, elimina o consegna i tuoi tornei attivi prima di eliminare il tuo account",
  },
  messages: {
    usernameUpdated: "Nome utente aggiornato",
    avatarUpdated: "Immagine del profilo aggiornata",
  },
  menu: {
    greeting: (username: string) => `Ciao, ${username}`,
    choose: "Scegli a cosa vuoi giocare.",
    profile: "Profilo",
    friends: "Amici",
    career: {
      kicker: "LA TUA SQUADRA",
      title: "Carriera dirigenziale",
      description: "Scegli i tuoi undici titolari, acquista carte e vinci partite tattiche contro i tuoi amici.",
      action: "Carriera manageriale aperta",
    },
    tournaments: {
      kicker: "CON GLI AMICI",
      title: "Tornei",
      description: "Crea, partecipa e segui i tuoi tornei FIFA e NHL.",
      action: "Vedi i tornei",
    },
    fantasy: {
      kicker: "PARTITE VERE",
      title: "Fantasy",
      description: "Scegli giocatori veri dai cinque grandi campionati e fai punti con le loro partite reali.",
      action: "Apri Fantasy",
    },
    historyTitle: "Due modalità, una storia",
    historyText: "Risultati e premi vengono salvati sul tuo profilo.",
    historyLink: "Vedi statistiche e premi",
  },
  modeMenu: {
    back: "← Menù",
  },
  confirmDialog: {
    title: "Sei sicuro?",
    no: "No",
    yes: "Sì",
  },
  audio: {
    turnOff: "Spegni la musica",
    play: "Riproduci la musica del torneo",
    label: "Musica da torneo",
  },
};

export type ProfileDict = typeof profile;
