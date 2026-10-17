import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/public/event-form";
import { requireAdmin } from "@/lib/auth/admin";
import { LOCKABLE_FIELDS } from "@/lib/host/host-event";
import { eventToForm } from "@/lib/public/event-form";
import { createClient } from "@/lib/supabase/server";
import { EDITABLE_STATUSES } from "@/lib/events/status";
import { saveAdminEventEdit } from "./actions";

export const metadata: Metadata = { title: "Edit event · Conscious Connections" };

// Admin event editor (client feedback, Oct 2026): fix details or set the repeat
// without going back to the host.
export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, county, start_at, end_at, description, poster_path, capacity, recurrence_rule, recurrence_until, external_registration_url, status, event_private_details(exact_address, host_name, host_email, host_phone, about_group), registrations(count)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!event || !(EDITABLE_STATUSES as readonly string[]).includes(event.status)) notFound();
  const details = event.event_private_details;
  if (!details) notFound();
  const registered = event.registrations[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <Link href={`/admin/events/${id}`} className="inline-flex min-h-tap items-center text-primary underline-offset-4 hover:underline">
        ‹ Back to the event
      </Link>
      <h1 className="text-2xl font-semibold sm:text-3xl">Edit event</h1>
      <p className="text-muted">Changes to a live event show on the website straight away. The host isn&apos;t emailed.</p>
      <div className="max-w-3xl">
        <EventForm
          action={saveAdminEventEdit.bind(null, id)}
          initial={eventToForm(event, details)}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          withConsent={false}
          locked={registered > 0 ? [...LOCKABLE_FIELDS] : []}
          lockedNote="These can't be changed because people have already registered."
        />
      </div>
    </div>
  );
}
