import type { Locale } from "../locales";

export const common = {
  appName: "Invialo!",
  siteDescription:
    "Crea tornei FIFA e NHL con i tuoi amici. Campionato, playoff, risultati e statistiche, oltre a una carriera da allenatore con le carte dei giocatori e un mercato di trasferimento.",
  manifestDescription: "App per tornei FIFA e NHL",
  logIn: "Accedi",
  logOut: "Esci",
  language: "Lingua",
  languageDescription: "Scegli la lingua in cui verrà visualizzata l'app. La tua scelta verrà salvata nel tuo account.",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "Inglese", no: "norvegese", sv: "Svedese", da: "danese", fi: "finlandese", es: "spagnolo", de: "tedesco", fr: "francese", zh: "Cinese semplificato", it: "italiano", ar: "Arabo",
  } as Record<Locale, string>,
  chooseLanguage: "Scegli la lingua",
  notLoggedIn: "Devi prima effettuare il login",
};

export type CommonDict = typeof common;
