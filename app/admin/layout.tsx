import { Toaster } from "@/components/ui/toaster";
import { readFlash } from "@/lib/flash";

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const flash = await readFlash();
  return (
    <>
      {children}
      <Toaster flash={flash} />
    </>
  );
}
