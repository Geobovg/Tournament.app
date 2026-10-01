export const profile = {
  page: {
    title: "Profil",
    description: "Se din historik og hold din konto opdateret.",
    accountAndSecurity: "Konto og sikkerhed",
  },
  avatar: {
    title: "Profilbillede",
    newAlt: "Nyt profilbillede",
    alt: "Profilbillede",
    resizeHint: (size: number) => `Billedet skaleres ned til ${size} px i din browser før upload, så billeder direkte fra dit telefonkamera fungerer fint.`,
    readFailed: "Kunne ikke læse billedet. Prøv en anden.",
    noCanvas: "Ingen tegneflade tilgængelig",
    compressFailed: "Billedet kunne ikke komprimeres",
    processing: "Behandler billede...",
    uploading: "Uploader...",
    upload: "Upload",
  },
  username: {
    title: "Brugernavn",
    newUsername: "Nyt brugernavn",
    code: "Sekscifret kode",
    save: "Gem brugernavn",
    saving: "Gemmer...",
  },
  passkey: {
    title: "Face ID / adgangsnøgle",
    description: "Konfigurer Face ID på din iPhone eller en adgangsnøgle på denne enhed for hurtigere login.",
  },
  deleteAccount: {
    title: "Slet konto",
    description: "Afsluttede turneringer opbevares anonymt. Aktive turneringer skal lukkes, slettes eller afleveres først.",
    codePlaceholder: "Sekscifret kode",
    submit: "Slet konto",
    deleting: "Sletter...",
  },
  errors: {
    invalidUsername: "Ugyldigt brugernavn",
    wrongCodeForUsername: "Indtast din korrekte sekscifrede kode for at ændre dit brugernavn",
    usernameTaken: "Det brugernavn er allerede taget",
    chooseImage: "Vælg først et billede",
    imageFormat: "Billedet skal være JPG, PNG eller WebP og ikke større end 2 MB",
    wrongCodeForDelete: "Indtast din korrekte sekscifrede kode for at slette din konto",
    activeTournaments: "Luk, slet eller overdrag dine aktive turneringer, før du sletter din konto",
  },
  messages: {
    usernameUpdated: "Brugernavn opdateret",
    avatarUpdated: "Profilbillede opdateret",
  },
  menu: {
    greeting: (username: string) => `Hej ${username}`,
    choose: "Vælg, hvad du vil spille.",
    profile: "Profil",
    friends: "Venner",
    career: {
      kicker: "DIT HOLD",
      title: "Manager karriere",
      description: "Vælg dine startelleve, køb kort og vind taktiske kampe mod dine venner.",
      action: "Åben lederkarriere",
    },
    tournaments: {
      kicker: "MED VENNER",
      title: "Turneringer",
      description: "Opret, deltag og følg dine FIFA- og NHL-turneringer.",
      action: "Se turneringer",
    },
    fantasy: {
      kicker: "RIGTIGE KAMPE",
      title: "Fantasy",
      description: "Vælg rigtige spillere fra de fem største ligaer, og få point for det, de gør i rigtige kampe.",
      action: "Åbn Fantasy",
    },
    historyTitle: "To tilstande, én historie",
    historyText: "Resultater og belønninger gemmes på din profil.",
    historyLink: "Se statistik og belønninger",
  },
  modeMenu: {
    back: "← Menu",
  },
  confirmDialog: {
    title: "Er du sikker?",
    no: "Nej",
    yes: "Ja",
  },
  audio: {
    turnOff: "Sluk for musikken",
    play: "Spil turneringsmusik",
    label: "Musik til turneringer",
  },
};

export type ProfileDict = typeof profile;
