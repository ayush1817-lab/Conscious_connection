import "server-only";
import { revalidatePath } from "next/cache";

// Public pages render on every request, so they are always fresh; this also
// clears any cached pages in visitors' browsers (Next.js router cache) after
// Karina changes events or website content. Admin pages are under the same
// root layout, so they refresh too.
export function revalidatePublicSite() {
  revalidatePath("/", "layout");
}
