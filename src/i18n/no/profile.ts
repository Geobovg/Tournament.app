import type { ProfileDict } from "../en/profile";

// Profilsiden, kontoinnstillinger, hovedmenyen og felles småting (bekreftelsesdialog, musikk).
export const profile: ProfileDict = {
  page: {
    title: "Profil",
    description: "Se historikken din og hold kontoen oppdatert.",
    accountAndSecurity: "Konto og sikkerhet",
  },
  avatar: {
    title: "Profilbilde",
    newAlt: "Nytt profilbilde",
    alt: "Profilbilde",
    resizeHint: (size: number) => `Bildet skaleres ned til ${size} px i nettleseren før opplasting, så bilder rett fra mobilkameraet går fint.`,
    readFailed: "Klarte ikke å lese bildet. Prøv et annet bilde.",
    noCanvas: "Fant ingen tegneflate",
    compressFailed: "Klarte ikke å komprimere bildet",
    processing: "Behandler bildet…",
    uploading: "Laster opp…",
    upload: "Last opp",
  },
  username: {
    title: "Brukernavn",
    newUsername: "Nytt brukernavn",
    code: "Sekssifret kode",
    save: "Lagre brukernavn",
    saving: "Lagrer…",
  },
  passkey: {
    title: "Face ID / passkey",
    description: "Registrer Face ID på iPhone eller en passkey på denne enheten for raskere innlogging.",
  },
  deleteAccount: {
    title: "Slett konto",
    description: "Fullførte turneringer beholdes anonymt. Aktive turneringer må lukkes, slettes eller overføres først.",
    codePlaceholder: "Sekssifret kode",
    submit: "Slett konto",
    deleting: "Sletter…",
  },
  errors: {
    invalidUsername: "Ugyldig brukernavn",
    wrongCodeForUsername: "Skriv inn riktig sekssifret kode for å endre brukernavn",
    usernameTaken: "Brukernavnet er allerede i bruk",
    chooseImage: "Velg et bilde først",
    imageFormat: "Bildet må være JPG, PNG eller WebP på maksimalt 2 MB",
    wrongCodeForDelete: "Skriv inn riktig sekssifret kode for å slette kontoen",
    activeTournaments: "Lukk, slett eller overfør de aktive turneringene dine før du sletter kontoen",
  },
  messages: {
    usernameUpdated: "Brukernavnet er oppdatert",
    avatarUpdated: "Profilbildet er oppdatert",
  },
  menu: {
    greeting: (username: string) => `Hei, ${username}`,
    choose: "Velg hva du vil spille.",
    profile: "Profil",
    friends: "Venner",
    career: {
      kicker: "DITT LAG",
      title: "Manager Karriere",
      description: "Sett elleveren, kjøp kort og vinn taktiske kamper mot vennene dine.",
      action: "Åpne managerkarriere",
    },
    tournaments: {
      kicker: "SAMMEN MED VENNER",
      title: "Turneringer",
      description: "Opprett, bli med i og følg FIFA- og NHL-turneringene deres.",
      action: "Se turneringer",
    },
    historyTitle: "To moduser, én historie",
    historyText: "Resultater og belønninger lagres på profilen din.",
    historyLink: "Se statistikk og belønninger",
  },
  modeMenu: {
    back: "← Meny",
  },
  confirmDialog: {
    title: "Er du sikker?",
    no: "Nei",
    yes: "Ja",
  },
  audio: {
    turnOff: "Skru av musikken",
    play: "Spill turneringsmusikk",
    label: "Turneringsmusikk",
  },
};

