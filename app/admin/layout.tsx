import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { readFlash } from "@/lib/flash";

// Admin pages must never be indexed.
// Admin page titles already end in "· Conscious Connections".
export const metadata: Metadata = {
  title: { template: "%s", default: "Admin · Conscious Connections" },
  robots: { index: false, follow: false },
};

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const flash = await readFlash();
  return (
    <>
      {children}
      <Toaster flash={flash} />
    </>
  );
}
