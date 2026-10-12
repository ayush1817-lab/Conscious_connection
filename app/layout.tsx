import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font: no requests to Google from visitors' browsers.
const body = Poppins({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body-loaded",
  display: "swap",
});

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Conscious Connections", template: "%s · Conscious Connections" },
  description:
    "A community for women and non-binary people across rural Ireland. Find local events, read stories and meet your people.",
  openGraph: { siteName: "Conscious Connections", locale: "en_IE", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#f1e9ff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE" className={body.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
