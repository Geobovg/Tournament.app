import type { Locale } from "../locales";

export const common = {
  appName: "Schicken Sie es!",
  siteDescription:
    "Erstelle FIFA- und NHL-Turniere mit deinen Freunden. Liga, Playoffs, Ergebnisse und Statistiken sowie eine Managerkarriere mit Spielerkarten und einem Transfermarkt.",
  manifestDescription: "Turnier-App für FIFA und NHL",
  logIn: "Melden Sie sich an",
  logOut: "Abmelden",
  language: "Sprache",
  languageDescription: "Wählen Sie aus, in welcher Sprache die App angezeigt wird. Ihre Auswahl wird in Ihrem Konto gespeichert.",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "Englisch", no: "Norwegisch", sv: "Schwedisch", da: "Dänisch", fi: "Finnisch", es: "Spanisch", de: "Deutsch", fr: "Französisch", zh: "Vereinfachtes Chinesisch", it: "Italienisch", ar: "Arabisch",
  } as Record<Locale, string>,
  chooseLanguage: "Sprache wählen",
  notLoggedIn: "Sie müssen sich zuerst anmelden",
};

export type CommonDict = typeof common;
