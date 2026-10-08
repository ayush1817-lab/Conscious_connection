import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

// Public event columns only. The anon role can't read anything else on events
// (see the initial migration), and RLS limits rows to live events that haven't ended.
export const PUBLIC_EVENT_COLUMNS = "id, title, county, start_at, end_at, description, poster_path, capacity" as const;

export type PublicEvent = {
  id: string;
  title: string;
  county: string;
  start_at: string;
  end_at: string;
  description: string;
  poster_path: string | null;
  capacity: number | null;
};

export async function getUpcomingEvents(limit: number): Promise<PublicEvent[]> {
  const { data, error } = await createPublicClient()
    .from("events")
    .select(PUBLIC_EVENT_COLUMNS)
    .eq("status", "live")
    .gt("end_at", new Date().toISOString())
    .order("start_at")
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
