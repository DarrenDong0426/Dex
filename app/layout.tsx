import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "ITAMI · Dex",
  description: "Game & anime profile tracker — Project Sekai, Genshin Impact, Clash Royale, Brawl Stars, and anime, all in one place.",
  // storage.sekai.best (Sekai card/music/stamp/honor art) has referrer-based
  // hotlink protection — a request with no Referer gets 200, the exact same
  // request with Referer: https://<our-domain>/ gets 403. Worked in local
  // dev (Referer was localhost, apparently not blocked) and broke silently
  // once actually deployed. no-referrer stops the browser sending a Referer
  // on cross-origin requests at all, site-wide, so this one change covers
  // every <img> tag pulling from that CDN instead of touching each one.
  referrer: "no-referrer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
