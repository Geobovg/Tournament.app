import type { Locale } from "../locales";
import type { CommonDict } from "../en/common";

// Tekst som brukes mange steder i appen: knapper, språkvalg og toppmenyen.
export const common: CommonDict = {
  appName: "Send it!",
  siteDescription:
    "Lag FIFA- og NHL-turneringer med vennene dine. Serie, sluttspill, resultater og statistikk, pluss managerkarriere med spillerkort og overgangsmarked.",
  manifestDescription: "Turneringsapp for FIFA og NHL",
  logIn: "Logg inn",
  logOut: "Logg ut",
  language: "Språk",
  languageDescription: "Velg hvilket språk appen skal vises på. Valget lagres på kontoen din.",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "Engelsk", no: "Norsk", sv: "Svensk", da: "Dansk", fi: "Finsk", es: "Spansk", de: "Tysk", fr: "Fransk", zh: "Forenklet kinesisk", it: "Italiensk", ar: "Arabisk",
  } as Record<Locale, string>,
  chooseLanguage: "Velg språk",
  notLoggedIn: "Du må logge inn først",
};

