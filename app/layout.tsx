import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conscious Connections",
  // Admin pages must never be indexed.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
