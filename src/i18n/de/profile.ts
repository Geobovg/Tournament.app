export const profile = {
  page: {
    title: "Profil",
    description: "Sehen Sie sich Ihren Verlauf an und halten Sie Ihr Konto auf dem neuesten Stand.",
    accountAndSecurity: "Konto und Sicherheit",
  },
  avatar: {
    title: "Profilbild",
    newAlt: "Neues Profilbild",
    alt: "Profilbild",
    resizeHint: (size: number) => `Das Bild wird vor dem Hochladen in Ihrem Browser auf ${size} Pixel verkleinert, sodass Fotos direkt von Ihrer Telefonkamera einwandfrei funktionieren.`,
    readFailed: "Das Bild konnte nicht gelesen werden. Versuchen Sie es mit einem anderen.",
    noCanvas: "Keine Zeichenfläche vorhanden",
    compressFailed: "Das Bild konnte nicht komprimiert werden",
    processing: "Bild wird verarbeitet…",
    uploading: "Hochladen…",
    upload: "Hochladen",
  },
  username: {
    title: "Benutzername",
    newUsername: "Neuer Benutzername",
    code: "Sechsstelliger Code",
    save: "Benutzernamen speichern",
    saving: "Sparen…",
  },
  passkey: {
    title: "Gesichts-ID/Passschlüssel",
    description: "Richten Sie Face ID auf Ihrem iPhone oder einen Passkey auf diesem Gerät ein, um die Anmeldung zu beschleunigen.",
  },
  deleteAccount: {
    title: "Konto löschen",
    description: "Abgeschlossene Turniere werden anonym geführt. Aktive Turniere müssen zunächst geschlossen, gelöscht oder übergeben werden.",
    codePlaceholder: "Sechsstelliger Code",
    submit: "Konto löschen",
    deleting: "Löschen…",
  },
  errors: {
    invalidUsername: "Ungültiger Benutzername",
    wrongCodeForUsername: "Geben Sie Ihren korrekten sechsstelligen Code ein, um Ihren Benutzernamen zu ändern",
    usernameTaken: "Dieser Benutzername ist bereits vergeben",
    chooseImage: "Wählen Sie zunächst ein Bild aus",
    imageFormat: "Das Bild muss im JPG-, PNG- oder WebP-Format vorliegen und darf nicht größer als 2 MB sein",
    wrongCodeForDelete: "Geben Sie Ihren korrekten sechsstelligen Code ein, um Ihr Konto zu löschen",
    activeTournaments: "Schließen, löschen oder übergeben Sie Ihre aktiven Turniere, bevor Sie Ihr Konto löschen",
  },
  messages: {
    usernameUpdated: "Benutzername aktualisiert",
    avatarUpdated: "Profilbild aktualisiert",
  },
  menu: {
    greeting: (username: string) => `Hallo, ${username}`,
    choose: "Wählen Sie aus, was Sie spielen möchten.",
    profile: "Profil",
    friends: "Freunde",
    career: {
      kicker: "DEIN TEAM",
      title: "Managerkarriere",
      description: "Wählen Sie Ihre Startelf, kaufen Sie Karten und gewinnen Sie taktische Spiele gegen Ihre Freunde.",
      action: "Offene Managerkarriere",
    },
    tournaments: {
      kicker: "MIT FREUNDEN",
      title: "Turniere",
      description: "Erstellen Sie Ihre FIFA- und NHL-Turniere, nehmen Sie daran teil und verfolgen Sie sie.",
      action: "Siehe Turniere",
    },
    historyTitle: "Zwei Modi, eine Geschichte",
    historyText: "Ergebnisse und Belohnungen werden in Ihrem Profil gespeichert.",
    historyLink: "Statistiken und Belohnungen ansehen",
  },
  modeMenu: {
    back: "← Menü",
  },
  confirmDialog: {
    title: "Bist du sicher?",
    no: "Nein",
    yes: "Ja",
  },
  audio: {
    turnOff: "Schalten Sie die Musik aus",
    play: "Spielen Sie Turniermusik",
    label: "Turniermusik",
  },
};

export type ProfileDict = typeof profile;
