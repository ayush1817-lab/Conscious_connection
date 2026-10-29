import { Toaster } from "@/components/ui/toaster";
import { readFlash } from "@/lib/flash";

// The one-off "Saved" style message, read from its cookie on the server.
export async function FlashToaster() {
  return <Toaster flash={await readFlash()} />;
}
