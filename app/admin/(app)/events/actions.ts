"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { setFlash } from "@/lib/flash";
import { createClient } from "@/lib/supabase/server";

// "Mark as seen" on an Update (host edit or host cancellation). Contact requests
// need a decision instead, so they can't be cleared this way.
export async function markAttentionSeen(itemId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: item, error } = await supabase
    .from("attention_items")
    .update({ seen_at: now, resolved_at: now })
    .eq("id", itemId)
    .eq("needs_decision", false)
    .is("resolved_at", null)
    .select("event_id, type, ref_id")
    .maybeSingle();

  if (error || !item) {
    await setFlash("That update was already cleared, or it needs a decision instead.", "error");
  } else {
    if (item.type === "host_edited" && item.ref_id) {
      await supabase.from("event_edits").update({ seen_at: now }).eq("id", item.ref_id);
    }
    await supabase.from("event_activity").insert({
      event_id: item.event_id,
      actor: "admin",
      action: item.type === "host_edited" ? "Saw the host's changes" : "Saw the host's cancellation",
    });
    await setFlash("Marked as seen.");
  }

  revalidatePath("/admin", "layout");
}
