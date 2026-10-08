import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font: no requests to Google from visitors' browsers.
const body = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-body-loaded",
  display: "swap",
  // Next.js has no fallback metrics for this font yet; without this it warns on every build.
  adjustFontFallback: false,
});
const heading = Fraunces({ subsets: ["latin"], variable: "--font-heading-loaded", display: "swap" });

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Conscious Connections", template: "%s · Conscious Connections" },
  description:
    "A community for women and non-binary people across rural Ireland. Find local events, read stories and meet your people.",
  openGraph: { siteName: "Conscious Connections", locale: "en_IE", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#7a3b5d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE" className={`${body.variable} ${heading.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
