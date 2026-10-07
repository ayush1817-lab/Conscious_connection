import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { generateHostToken } from "./host-token";

export class HostLinkError extends Error {}

// A6 "Regenerate host link": a new private link for a live event. The old one
// stops working because only the new token's hash is kept.
export async function regenerateHostLink(supabase: SupabaseClient<Database>, eventId: string) {
  const { token, hash } = generateHostToken();
  const { data: event, error } = await supabase
    .from("events")
    .update({ host_edit_token_hash: hash })
    .eq("id", eventId)
    .eq("status", "live")
    .gte("end_at", new Date().toISOString())
    .select("id, title, county, start_at, end_at")
    .maybeSingle();
  if (error) throw error;
  if (!event) throw new HostLinkError("A new host link can only be made for a live event that hasn't ended.");

  await supabase.from("event_activity").insert({
    event_id: eventId,
    actor: "admin",
    action: "Sent the host a new private link",
    note: "The old link no longer works.",
  });
  return { event, token };
}
