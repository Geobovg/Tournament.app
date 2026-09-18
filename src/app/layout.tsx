import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AudioPlayer } from "@/components/audio-player";
import { listTracks } from "@/lib/audio";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Send it!",
  description: "Turneringsapp for FIFA og NHL",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [tracks, user] = await Promise.all([listTracks(), currentUser()]);

  return (
    <html
      lang="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="text-4xl font-bold tracking-tight">
              Send it!
            </Link>
            <div className="flex items-center gap-3 text-sm">
              {user ? <><Link href="/profile" className="text-muted hover:text-foreground">{user.username}</Link><form action={logoutAction}><button className="text-muted hover:text-foreground">Logg ut</button></form></> : <Link href="/login" className="text-muted hover:text-foreground">Logg inn</Link>}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <AudioPlayer tracks={tracks} />
        <SpeedInsights />
      </body>
    </html>
  );
}
