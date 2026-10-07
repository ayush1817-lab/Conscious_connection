import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export class AttentionError extends Error {}

// "Mark as seen" on an Update (host edit or host cancellation). Contact
// requests need a decision instead, so they can't be cleared this way.
export async function markSeen(supabase: Client, itemId: string) {
  const now = new Date().toISOString();
  const { data: item, error } = await supabase
    .from("attention_items")
    .update({ seen_at: now, resolved_at: now })
    .eq("id", itemId)
    .eq("needs_decision", false)
    .is("resolved_at", null)
    .select("event_id, type, ref_id")
    .maybeSingle();
  if (error) throw error;
  if (!item) throw new AttentionError("That update was already cleared, or it needs a decision instead.");

  if (item.type === "host_edited" && item.ref_id) {
    await supabase.from("event_edits").update({ seen_at: now }).eq("id", item.ref_id);
  }
  await supabase.from("event_activity").insert({
    event_id: item.event_id,
    actor: "admin",
    action: item.type === "host_edited" ? "Saw the host's changes" : "Saw the host's cancellation",
  });
  return item;
}

// Records Karina's decision on a contact request and clears its attention item.
// Only works once: a request already decided elsewhere is refused.
export async function decideContactRequest(
  supabase: Client,
  itemId: string,
  decision: { status: "shared" } | { status: "declined"; reason: string },
) {
  const { data: item } = await supabase
    .from("attention_items")
    .select("event_id, ref_id")
    .eq("id", itemId)
    .eq("type", "contact_request")
    .is("resolved_at", null)
    .maybeSingle();
  if (!item?.ref_id) throw new AttentionError("This request has already been answered.");

  const now = new Date().toISOString();
  const { data: request, error } = await supabase
    .from("contact_requests")
    .update({
      status: decision.status,
      admin_reason: decision.status === "declined" ? decision.reason : null,
      decided_at: now,
    })
    .eq("id", item.ref_id)
    .eq("status", "requested")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!request) throw new AttentionError("This request has already been answered.");

  await supabase.from("attention_items").update({ seen_at: now, resolved_at: now }).eq("id", itemId);
  await supabase.from("event_activity").insert({
    event_id: item.event_id,
    actor: "admin",
    action: decision.status === "shared" ? "Shared registrants' contact details" : "Declined the contact details request",
    note: decision.status === "declined" ? decision.reason : null,
  });
}

// When an event is taken down or cancelled, nothing about it needs attention
// any more: clear its open items and close any open contact request (no email,
// since the host has just been told the event is off).
export async function closeEventAttention(supabase: Client, eventId: string, why: string) {
  const now = new Date().toISOString();
  await supabase
    .from("attention_items")
    .update({ seen_at: now, resolved_at: now })
    .eq("event_id", eventId)
    .is("resolved_at", null);
  await supabase
    .from("contact_requests")
    .update({ status: "declined", admin_reason: why, decided_at: now })
    .eq("event_id", eventId)
    .eq("status", "requested");
}
