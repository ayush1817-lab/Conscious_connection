import "server-only";
import { cookies } from "next/headers";

// One-off confirmation message shown as a toast on the next page load.
// Set it in a server action before redirecting; <Toaster> shows and clears it.
export const FLASH_COOKIE = "cc_flash";

export type Flash = { message: string; tone: "success" | "error" };

export async function setFlash(message: string, tone: Flash["tone"] = "success") {
  const store = await cookies();
  store.set(FLASH_COOKIE, JSON.stringify({ message, tone }), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    // Read and cleared by the browser after it is shown.
    httpOnly: false,
  });
}

export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Flash;
  } catch {
    return null;
  }
}
