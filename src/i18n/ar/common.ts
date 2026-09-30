import type { Locale } from "../locales";

export const common = {
  appName: "أرسلها!",
  siteDescription:
    "قم بإنشاء بطولات FIFA وNHL مع أصدقائك. الدوري والتصفيات والنتائج والإحصائيات، بالإضافة إلى مهنة المدير مع بطاقات اللاعبين وسوق الانتقالات.",
  manifestDescription: "تطبيق البطولة لـ FIFA وNHL",
  logIn: "تسجيل الدخول",
  logOut: "تسجيل الخروج",
  language: "اللغة",
  languageDescription: "اختر اللغة التي سيتم عرض التطبيق بها. ويتم حفظ اختيارك في حسابك.",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "الإنجليزية", no: "النرويجية", sv: "السويدية", da: "الدنماركية", fi: "الفنلندية", es: "الاسبانية", de: "الألمانية", fr: "الفرنسية", zh: "الصينية المبسطة", it: "ايطالي", ar: "العربية",
  } as Record<Locale, string>,
  chooseLanguage: "اختر اللغة",
  notLoggedIn: "تحتاج إلى تسجيل الدخول أولا",
};

export type CommonDict = typeof common;
