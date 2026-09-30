import type { Locale } from "../locales";

export const common = {
  appName: "Send it!",
  siteDescription:
    "Create FIFA and NHL tournaments with your friends. League, playoffs, results and stats, plus a manager career with player cards and a transfer market.",
  manifestDescription: "Tournament app for FIFA and NHL",
  logIn: "Log in",
  logOut: "Log out",
  language: "Language",
  languageDescription: "Choose which language the app is shown in. Your choice is saved to your account.",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "English", no: "Norwegian", sv: "Swedish", da: "Danish", fi: "Finnish", es: "Spanish", de: "German", fr: "French", zh: "Simplified Chinese", it: "Italian", ar: "Arabic",
  } as Record<Locale, string>,
  chooseLanguage: "Choose language",
  notLoggedIn: "You need to log in first",
};

export type CommonDict = typeof common;
