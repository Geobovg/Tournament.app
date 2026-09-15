import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { AudioPlayer } from "@/components/audio-player";
import { listTracks } from "@/lib/audio";
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
  title: "Futebol",
  description: "Turneringsapp for FIFA og NHL",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tracks = await listTracks();

  return (
    <html
      lang="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border">
          <div className="mx-auto w-full max-w-5xl px-4 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Futebol
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <AudioPlayer tracks={tracks} />
      </body>
    </html>
  );
}
