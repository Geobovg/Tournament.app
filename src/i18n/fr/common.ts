import type { Locale } from "../locales";

export const common = {
  appName: "Envoyez-le !",
  siteDescription:
    "Créez des tournois FIFA et NHL avec vos amis. Ligue, séries éliminatoires, résultats et statistiques, plus une carrière d'entraîneur avec des cartes de joueur et un marché des transferts.",
  manifestDescription: "Application de tournoi pour FIFA et NHL",
  logIn: "Connectez-vous",
  logOut: "Se déconnecter",
  language: "Langue",
  languageDescription: "Choisissez la langue dans laquelle l'application s'affiche. Votre choix est enregistré sur votre compte.",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "Anglais", no: "norvégien", sv: "suédois", da: "Danois", fi: "Finnois", es: "Espagnol", de: "Allemand", fr: "Français", zh: "Chinois simplifié", it: "Italien", ar: "arabe",
  } as Record<Locale, string>,
  chooseLanguage: "Choisir la langue",
  notLoggedIn: "Vous devez d'abord vous connecter",
};

export type CommonDict = typeof common;
