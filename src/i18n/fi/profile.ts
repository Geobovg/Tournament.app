export const profile = {
  page: {
    title: "Profiili",
    description: "Katso historiasi ja pidä tilisi ajan tasalla.",
    accountAndSecurity: "Tili ja turvallisuus",
  },
  avatar: {
    title: "Profiilikuva",
    newAlt: "Uusi profiilikuva",
    alt: "Profiilikuva",
    resizeHint: (size: number) => `Kuva skaalataan ${size} pikseliin selaimessasi ennen lataamista, joten kuvat suoraan puhelimen kamerasta toimivat hyvin.`,
    readFailed: "Kuvaa ei voitu lukea. Kokeile toista.",
    noCanvas: "Piirustuspintaa ei ole saatavilla",
    compressFailed: "Kuvaa ei voitu pakata",
    processing: "Käsitellään kuvaa…",
    uploading: "Ladataan…",
    upload: "Lataa",
  },
  username: {
    title: "Käyttäjätunnus",
    newUsername: "Uusi käyttäjätunnus",
    code: "Kuusinumeroinen koodi",
    save: "Tallenna käyttäjätunnus",
    saving: "Tallennetaan…",
  },
  passkey: {
    title: "Kasvotunnus / salasana",
    description: "Määritä Face ID iPhonellesi tai salasana tälle laitteelle nopeaa kirjautumista varten.",
  },
  deleteAccount: {
    title: "Poista tili",
    description: "Valmiit turnaukset säilytetään nimettöminä. Aktiiviset turnaukset on suljettava, poistettava tai luovutettava ensin.",
    codePlaceholder: "Kuusinumeroinen koodi",
    submit: "Poista tili",
    deleting: "Poistetaan…",
  },
  errors: {
    invalidUsername: "Virheellinen käyttäjätunnus",
    wrongCodeForUsername: "Syötä oikea kuusinumeroinen koodi vaihtaaksesi käyttäjätunnuksesi",
    usernameTaken: "Tämä käyttäjätunnus on jo varattu",
    chooseImage: "Valitse ensin kuva",
    imageFormat: "Kuvan on oltava JPG, PNG tai WebP ja enintään 2 Mt",
    wrongCodeForDelete: "Anna oikea kuusinumeroinen koodisi poistaaksesi tilisi",
    activeTournaments: "Sulje, poista tai luovuta aktiiviset turnaukset ennen tilisi poistamista",
  },
  messages: {
    usernameUpdated: "Käyttäjätunnus päivitetty",
    avatarUpdated: "Profiilikuva päivitetty",
  },
  menu: {
    greeting: (username: string) => `Hei ${username}`,
    choose: "Valitse mitä haluat pelata.",
    profile: "Profiili",
    friends: "Ystävät",
    career: {
      kicker: "TIIMISI",
      title: "Managerin ura",
      description: "Valitse aloitusyksitoista, osta kortteja ja voita taktisia otteluita ystäviäsi vastaan.",
      action: "Avaa Managerin ura",
    },
    tournaments: {
      kicker: "YSTÄVIEN KANSSA",
      title: "Turnaukset",
      description: "Luo, liity ja seuraa FIFA- ja NHL-turnauksiasi.",
      action: "Katso turnaukset",
    },
    fantasy: {
      kicker: "OIKEAT OTTELUT",
      title: "Fantasy",
      description: "Valitse oikeita pelaajia viidestä suurimmasta liigasta ja saa pisteitä heidän oikeista otteluistaan.",
      action: "Avaa Fantasy",
    },
    historyTitle: "Kaksi tilaa, yksi tarina",
    historyText: "Tulokset ja palkinnot tallennetaan profiiliisi.",
    historyLink: "Katso tilastot ja palkinnot",
  },
  modeMenu: {
    back: "← Valikko",
  },
  confirmDialog: {
    title: "Oletko varma?",
    no: "Ei",
    yes: "Kyllä",
  },
  audio: {
    turnOff: "Sammuta musiikki",
    play: "Soita turnausmusiikkia",
    label: "Turnauksen musiikki",
  },
};

export type ProfileDict = typeof profile;
