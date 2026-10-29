import type { Metadata } from "next";

// Admin pages must never be indexed.
// Admin page titles already end in "· Conscious Connections".
// The "Saved" toasts live in the (app) and (auth) layouts, so the website
// preview (admin/preview) never shows or clears one.
export const metadata: Metadata = {
  title: { template: "%s", default: "Admin · Conscious Connections" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
