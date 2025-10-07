import type { Metadata } from "next";
import "./globals.css";
import ServerStatus from './components/ServerStatus';
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Memecoin Scanner",
  description: "A tool for tracking memecoins",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const secret = process.env.SCRAPE_SECRET || '';
  const isDev = process.env.NODE_ENV !== 'production';
  return (
    <html lang="en">
      <head>
        {isDev && secret ? (
          // Inject secret for admin UI convenience in development only
          <script dangerouslySetInnerHTML={{ __html: `window.__SCRAPE_SECRET = ${JSON.stringify(secret)};` }} />
        ) : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
      >
        <ServerStatus />
        {children}
      </body>
    </html>
  );
}
