import type { Locale } from "../locales";

export const common = {
  appName: "Send det!",
  siteDescription:
    "Opret FIFA- og NHL-turneringer med dine venner. Liga, slutspil, resultater og statistik plus en managerkarriere med spillerkort og et transfermarked.",
  manifestDescription: "Turneringsapp til FIFA og NHL",
  logIn: "Log ind",
  logOut: "Log ud",
  language: "Sprog",
  languageDescription: "Vælg hvilket sprog appen skal vises på. Dit valg gemmes på din konto.",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "engelsk", no: "norsk", sv: "svensk", da: "dansk", fi: "finsk", es: "spansk", de: "tysk", fr: "fransk", zh: "Forenklet kinesisk", it: "italiensk", ar: "arabisk",
  } as Record<Locale, string>,
  chooseLanguage: "Vælg sprog",
  notLoggedIn: "Du skal først logge ind",
};

export type CommonDict = typeof common;
