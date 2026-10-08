"use server";

import { revalidatePublicSite } from "@/lib/revalidate";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { AttentionError, markSeen } from "@/lib/events/attention";
import { setFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";

// "Mark as seen" on an Update (host edit or host cancellation), from A2 or A7.
// From A7 it goes back to the overview; from A2 it stays put.
export async function markAttentionSeen(itemId: string, returnTo: string | null) {
  await requireAdmin();
  const supabase = await createClient();

  try {
    await markSeen(supabase, itemId);
    await setFlash("Marked as seen.");
  } catch (error) {
    if (!(error instanceof AttentionError)) throw error;
    await setFlash(error.message, "error");
  }

  revalidatePublicSite();
  if (returnTo) redirect(returnTo);
}
