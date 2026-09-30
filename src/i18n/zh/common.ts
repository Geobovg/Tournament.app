import type { Locale } from "../locales";

export const common = {
  appName: "发送吧！",
  siteDescription:
    "与您的朋友一起创建 FIFA 和 NHL 锦标赛。联赛、季后赛、结果和统计数据，以及经理职业生涯、球员卡和转会市场。",
  manifestDescription: "FIFA 和 NHL 锦标赛应用程序",
  logIn: "登录",
  logOut: "退出",
  language: "语言",
  languageDescription: "选择应用程序显示的语言。您的选择将保存到您的帐户中。",
  // Navnene på språkene, skrevet på språket appen vises på nå.
  languageNames: {
    en: "英语", no: "挪威语", sv: "瑞典语", da: "丹麦语", fi: "芬兰语", es: "西班牙语", de: "德语", fr: "法语", zh: "简体中文", it: "意大利语", ar: "阿拉伯语",
  } as Record<Locale, string>,
  chooseLanguage: "选择语言",
  notLoggedIn: "您需要先登录",
};

export type CommonDict = typeof common;
