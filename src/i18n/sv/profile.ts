export const profile = {
  page: {
    title: "Profil",
    description: "Se din historik och håll ditt konto uppdaterat.",
    accountAndSecurity: "Konto och säkerhet",
  },
  avatar: {
    title: "Profilbild",
    newAlt: "Ny profilbild",
    alt: "Profilbild",
    resizeHint: (size: number) => `Bilden skalas ner till ${size} px i din webbläsare innan den laddas upp, så bilder direkt från telefonens kamera fungerar bra.`,
    readFailed: "Kunde inte läsa bilden. Prova en annan.",
    noCanvas: "Ingen rityta tillgänglig",
    compressFailed: "Det gick inte att komprimera bilden",
    processing: "Bearbetar bild...",
    uploading: "Laddar upp...",
    upload: "Ladda upp",
  },
  username: {
    title: "Användarnamn",
    newUsername: "Nytt användarnamn",
    code: "Sexsiffrig kod",
    save: "Spara användarnamn",
    saving: "Sparar...",
  },
  passkey: {
    title: "Face ID / lösenord",
    description: "Ställ in Face ID på din iPhone eller en lösenordsnyckel på den här enheten för snabbare inloggning.",
  },
  deleteAccount: {
    title: "Ta bort konto",
    description: "Avslutade turneringar hålls anonymt. Aktiva turneringar måste stängas, raderas eller lämnas över först.",
    codePlaceholder: "Sexsiffrig kod",
    submit: "Ta bort konto",
    deleting: "Tar bort...",
  },
  errors: {
    invalidUsername: "Ogiltigt användarnamn",
    wrongCodeForUsername: "Ange din korrekta sexsiffriga kod för att ändra ditt användarnamn",
    usernameTaken: "Det användarnamnet är redan upptaget",
    chooseImage: "Välj en bild först",
    imageFormat: "Bilden måste vara JPG, PNG eller WebP och inte större än 2 MB",
    wrongCodeForDelete: "Ange din korrekta sexsiffriga kod för att radera ditt konto",
    activeTournaments: "Stäng, ta bort eller lämna över dina aktiva turneringar innan du tar bort ditt konto",
  },
  messages: {
    usernameUpdated: "Användarnamnet har uppdaterats",
    avatarUpdated: "Profilbilden uppdaterad",
  },
  menu: {
    greeting: (username: string) => `Hej, ${username}`,
    choose: "Välj vad du vill spela.",
    profile: "Profil",
    friends: "Vänner",
    career: {
      kicker: "DITT LAG",
      title: "Chefskarriär",
      description: "Välj din startelva, köp kort och vinn taktiska matcher mot dina vänner.",
      action: "Öppna chefskarriär",
    },
    tournaments: {
      kicker: "MED VÄNNER",
      title: "Turneringar",
      description: "Skapa, gå med och följ dina FIFA- och NHL-turneringar.",
      action: "Se turneringar",
    },
    fantasy: {
      kicker: "RIKTIGA MATCHER",
      title: "Fantasy",
      description: "Välj riktiga spelare från de fem största ligorna och få poäng utifrån deras riktiga matcher.",
      action: "Öppna Fantasy",
    },
    historyTitle: "Två lägen, en historia",
    historyText: "Resultat och belöningar sparas i din profil.",
    historyLink: "Se statistik och belöningar",
  },
  modeMenu: {
    back: "← Meny",
  },
  confirmDialog: {
    title: "Är du säker?",
    no: "Nej",
    yes: "Ja",
  },
  audio: {
    turnOff: "Stäng av musiken",
    play: "Spela turneringsmusik",
    label: "Turneringsmusik",
  },
};

export type ProfileDict = typeof profile;
