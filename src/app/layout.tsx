import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AudioPlayer } from "@/components/audio-player";
import { LanguageSwitch } from "@/components/language-switch";
import { listTracks } from "@/lib/audio";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { SITE_URL } from "@/lib/site";
import { I18nProvider } from "@/i18n/client";
import { getLocale, getT } from "@/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "Send it!", template: "%s · Send it!" },
    description: t.common.siteDescription,
    openGraph: { siteName: "Send it!", locale: locale === "no" ? "nb_NO" : "en_GB", type: "website", description: t.common.siteDescription },
    // Lar appen åpnes i fullskjerm uten Safari-menyer når den er lagt til på hjemskjermen.
    appleWebApp: {
      capable: true,
      title: "Send it!",
      statusBarStyle: "black-translucent",
    },
    // Next.js skriver bare ut mobile-web-app-capable; eldre iOS-versjoner krever Apple-varianten.
    other: { "apple-mobile-web-app-capable": "yes", google: "notranslate" },
  };
}

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#0b0f14",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [tracks, user, locale] = await Promise.all([listTracks(), currentUser(), getLocale()]);
  const t = await getT();

  return (
    <html
      lang={locale}
      // Appen har eget språkvalg, så nettleseren skal ikke maskinoversette siden (f.eks. Chrome engelsk → norsk).
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <I18nProvider locale={locale}>
        <header className="border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4">
            <span className="text-4xl font-bold tracking-tight">Send it!</span>
            <div className="flex items-center gap-3 text-sm">
              <LanguageSwitch compact />
              {user ? <form action={logoutAction}><button className="text-muted hover:text-foreground">{t.common.logOut}</button></form> : <a href="/login" className="text-muted hover:text-foreground">{t.common.logIn}</a>}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8">{children}</main>
        <AudioPlayer tracks={tracks} />
        </I18nProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
