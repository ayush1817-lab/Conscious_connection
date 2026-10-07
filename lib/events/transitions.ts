import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { generateHostToken } from "./host-token";
import { STATUS_LABELS, type EventStatus } from "./status";

export type Actor = "admin" | "host";

type Rule = { actors: Actor[]; requiresReason?: boolean; requiresConfirmation?: boolean; activity: string };

// Every allowed status change (spec section 4). Anything not listed is rejected.
export const TRANSITIONS: Partial<Record<EventStatus, Partial<Record<EventStatus, Rule>>>> = {
  pending: {
    live: { actors: ["admin"], activity: "Approved" },
    needs_changes: { actors: ["admin"], requiresReason: true, activity: "Requested changes" },
    declined: { actors: ["admin"], requiresReason: true, activity: "Declined" },
  },
  needs_changes: {
    pending: { actors: ["host"], activity: "Resubmitted after changes" },
  },
  live: {
    cancelled: { actors: ["admin", "host"], requiresConfirmation: true, activity: "Cancelled" },
    taken_down: { actors: ["admin"], requiresReason: true, activity: "Taken down" },
  },
};

export const REASON_MAX_LENGTH = 1000;

export class TransitionError extends Error {}

// Plain-language reasons, shown to Karina as-is.
const ACTION_NAMES: Partial<Record<EventStatus, string>> = {
  live: "approved",
  needs_changes: "sent back for changes",
  declined: "declined",
  cancelled: "cancelled",
  taken_down: "taken down",
  pending: "resubmitted",
};

export function checkTransition(
  from: EventStatus,
  to: EventStatus,
  actor: Actor,
  input: { reason?: string | null; confirmed?: boolean } = {},
): Rule {
  const rule = TRANSITIONS[from]?.[to];
  if (!rule) {
    throw new TransitionError(
      `This event is ${STATUS_LABELS[from].toLowerCase()}, so it can't be ${ACTION_NAMES[to] ?? "changed that way"}.`,
    );
  }
  if (!rule.actors.includes(actor)) {
    throw new TransitionError(`Only ${rule.actors.join(" or ")} can make this change.`);
  }
  const reason = input.reason?.trim() ?? "";
  if (rule.requiresReason && !reason) {
    throw new TransitionError("Please write a reason. It will be emailed to the host.");
  }
  if (reason.length > REASON_MAX_LENGTH) {
    throw new TransitionError(`Please keep the reason under ${REASON_MAX_LENGTH} characters.`);
  }
  if (rule.requiresConfirmation && !input.confirmed) {
    throw new TransitionError("Please confirm this change first.");
  }
  return rule;
}

export type TransitionResult = {
  event: { id: string; title: string; county: string; start_at: string; end_at: string; status: EventStatus };
  // The raw private host link token. Only returned here, never stored.
  hostToken: string | null;
};

// The one place an event's status changes. Checks the move is allowed, applies
// it only if nobody else changed the event meanwhile, and logs the activity.
export async function transitionEvent(
  supabase: SupabaseClient<Database>,
  args: {
    eventId: string;
    to: EventStatus;
    actor: Actor;
    reason?: string | null;
    confirmed?: boolean;
  },
): Promise<TransitionResult> {
  const { data: current, error: readError } = await supabase
    .from("events")
    .select("status")
    .eq("id", args.eventId)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) throw new TransitionError("That event couldn't be found.");

  const from = current.status;
  const rule = checkTransition(from, args.to, args.actor, args);
  const reason = args.reason?.trim() || null;
  const now = new Date().toISOString();

  const update: Database["public"]["Tables"]["events"]["Update"] = { status: args.to };
  if (rule.requiresReason) update.status_reason = reason;
  if (args.to === "pending" || args.to === "live") update.status_reason = null;
  // A resubmitted request shows as "New" again on the overview.
  if (args.to === "pending") update.opened_by_admin_at = null;

  // Approving creates the private host link. Requesting changes does too, so
  // the host can fix the event from the link in their email.
  let hostToken: string | null = null;
  if (args.to === "live" || args.to === "needs_changes") {
    const { token, hash } = generateHostToken();
    hostToken = token;
    update.host_edit_token_hash = hash;
  }
  if (args.to === "live") update.approved_at = now;

  const { data: event, error } = await supabase
    .from("events")
    .update(update)
    .eq("id", args.eventId)
    .eq("status", from) // Fails if the status changed since we read it.
    .select("id, title, county, start_at, end_at, status")
    .maybeSingle();
  if (error) throw error;
  if (!event) {
    const { data: latest } = await supabase.from("events").select("status").eq("id", args.eventId).maybeSingle();
    const status = latest ? STATUS_LABELS[latest.status].toLowerCase() : "deleted";
    throw new TransitionError(`Someone changed this event a moment ago (it is now ${status}), so nothing was done.`);
  }

  const { error: logError } = await supabase.from("event_activity").insert({
    event_id: event.id,
    actor: args.actor,
    action: rule.activity,
    note: reason,
  });
  if (logError) console.error("Could not log event activity", logError);

  return { event, hostToken };
}
