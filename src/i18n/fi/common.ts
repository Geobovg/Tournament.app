import type { Locale } from "../locales";

export const common = {
  appName: "Lähetä se!",
  siteDescription:
    "Luo FIFA- ja NHL-turnauksia ystäviesi kanssa. Liiga, pudotuspelit, tulokset ja tilastot sekä manageriura pelaajakorteilla ja siirtomarkkinoilla.",
  manifestDescription: "Turnaussovellus FIFA:lle ja NHL:lle",
  logIn: "Kirjaudu sisään",
  logOut: "Kirjaudu ulos",
  language: "Kieli",
  languageDescription: "Valitse, millä kielellä sovellus näytetään. Valintasi tallennetaan tilillesi.",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "englanti", no: "norjalainen", sv: "ruotsinkielinen", da: "tanskalainen", fi: "suomalainen", es: "espanja", de: "saksaksi", fr: "ranskalainen", zh: "Yksinkertaistettu kiina", it: "italialainen", ar: "arabia",
  } as Record<Locale, string>,
  chooseLanguage: "Valitse kieli",
  notLoggedIn: "Sinun on ensin kirjauduttava sisään",
};

export type CommonDict = typeof common;
