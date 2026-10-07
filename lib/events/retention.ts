import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type RetentionResult = {
  cutoff: string;
  registrations: number;
  host_details: number;
  contact_requests: number;
  host_edits: number;
  attention_items: number;
  host_links: number;
  email_records: number;
};

// Runs the daily GDPR cleanup (supabase/migrations/*_retention.sql). Needs a
// service-role client: the database function can't be called by anyone else.
export async function runRetention(client: SupabaseClient<Database>): Promise<RetentionResult> {
  const { data, error } = await client.rpc("run_retention");
  if (error) throw new Error(`Retention cleanup failed: ${error.message}`);
  return data as RetentionResult;
}
