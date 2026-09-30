import type { Locale } from "../locales";

export const common = {
  appName: "Skicka det!",
  siteDescription:
    "Skapa FIFA- och NHL-turneringar med dina vänner. Liga, slutspel, resultat och statistik, plus en managerkarriär med spelarkort och en transfermarknad.",
  manifestDescription: "Turneringsapp för FIFA och NHL",
  logIn: "Logga in",
  logOut: "Logga ut",
  language: "Språk",
  languageDescription: "Välj vilket språk appen visas på. Ditt val sparas på ditt konto.",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "engelska", no: "norska", sv: "svenska", da: "danska", fi: "finska", es: "spanska", de: "tyska", fr: "franska", zh: "Förenklad kinesiska", it: "italienska", ar: "arabiska",
  } as Record<Locale, string>,
  chooseLanguage: "Välj språk",
  notLoggedIn: "Du måste logga in först",
};

export type CommonDict = typeof common;
