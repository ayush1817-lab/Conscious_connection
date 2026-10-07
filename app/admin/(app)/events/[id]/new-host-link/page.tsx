import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CopyHostLink } from "@/components/events/copy-host-link";
import { ButtonLink } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { hostLinkUrl } from "@/lib/links";
import { createClient } from "@/lib/supabase/server";
import { hostLinkCookie, readHostLinkCookie } from "../host-link-cookie";

export const metadata: Metadata = { title: "New host link · Conscious Connections" };

// Shown after "Regenerate host link" on A6. Like A5, the link is only available here.
export default async function NewHostLinkPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, event_private_details(host_name, host_email)")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const hostName = event.event_private_details?.host_name ?? "The host";
  const saved = readHostLinkCookie((await cookies()).get(hostLinkCookie(id, "new-host-link").name)?.value);

  return (
    <div className="mx-auto max-w-xl space-y-6 py-4 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">New host link sent.</h1>
        <p className="text-lg">
          The old link for <span className="font-medium">{event.title}</span> no longer works.
        </p>
        {saved?.emailed === false ? (
          <p role="alert" className="rounded-card border border-danger bg-surface px-4 py-3 text-left text-danger">
            The email to {hostName} couldn&apos;t be sent. Copy the new link below and send it to them yourself
            {event.event_private_details ? ` at ${event.event_private_details.host_email}` : ""}.
          </p>
        ) : saved ? (
          <p className="text-lg">{hostName} has been emailed the new link.</p>
        ) : null}
      </div>

      {saved ? (
        <>
          <div className="flex justify-center">
            <CopyHostLink url={hostLinkUrl(saved.token)} />
          </div>
          <p className="text-sm text-muted">
            The link is only shown here, right after making it. Anyone who has it can edit or cancel the event, so only
            share it with {hostName}.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">For safety, the host link is only shown right after making it.</p>
      )}

      <div className="flex justify-center border-t border-border pt-6">
        <ButtonLink href={`/admin/events/${id}`} variant="secondary">
          Back to the event
        </ButtonLink>
      </div>
    </div>
  );
}
