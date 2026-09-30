import type { Locale } from "../locales";

export const common = {
  appName: "¡Envíalo!",
  siteDescription:
    "Crea torneos de FIFA y NHL con tus amigos. Liga, playoffs, resultados y estadísticas, además de una carrera de entrenador con tarjetas de jugadores y un mercado de fichajes.",
  manifestDescription: "Aplicación de torneos para FIFA y NHL",
  logIn: "Iniciar sesión",
  logOut: "Cerrar sesión",
  language: "Idioma",
  languageDescription: "Elija en qué idioma se muestra la aplicación. Su elección se guarda en su cuenta.",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "ingles", no: "noruego", sv: "sueco", da: "danés", fi: "finlandés", es: "español", de: "alemán", fr: "francés", zh: "Chino simplificado", it: "italiano", ar: "árabe",
  } as Record<Locale, string>,
  chooseLanguage: "Elige idioma",
  notLoggedIn: "Primero debes iniciar sesión",
};

export type CommonDict = typeof common;
