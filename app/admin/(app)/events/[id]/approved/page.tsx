import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CopyHostLink } from "@/components/events/copy-host-link";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { hostLinkUrl, publicEventUrl } from "@/lib/links";
import { createClient } from "@/lib/supabase/server";
import { hostLinkCookie, readHostLinkCookie } from "../host-link-cookie";

export const metadata: Metadata = { title: "Approved · Conscious Connections" };

// A5 – Approved confirmation. The private host link is only available here,
// straight after approving, because only its hash is stored.
export default async function ApprovedPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, status, event_private_details(host_name, host_email)")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();
  if (event.status !== "live") redirect(`/admin/events/${id}`);

  const hostName = event.event_private_details?.host_name ?? "The host";
  const saved = readHostLinkCookie((await cookies()).get(hostLinkCookie(id).name)?.value);

  return (
    <div className="mx-auto max-w-xl space-y-6 py-4 text-center">
      <div aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl text-on-primary">
        ✓
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Approved.</h1>
        <p className="text-lg">
          <span className="font-medium">{event.title}</span> is now live.
        </p>
        {saved?.emailed === false ? (
          <p role="alert" className="rounded-card border border-danger bg-surface px-4 py-3 text-left text-danger">
            The email to {hostName} couldn&apos;t be sent. Copy their private link below and send it to them yourself
            {event.event_private_details ? ` at ${event.event_private_details.host_email}` : ""}.
          </p>
        ) : (
          <p className="text-lg">{hostName} has been emailed their private link.</p>
        )}
      </div>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <a href={publicEventUrl(id)} target="_blank" rel="noreferrer" className={buttonClass("primary")}>
          View live event
        </a>
        {saved ? <CopyHostLink url={hostLinkUrl(saved.token)} /> : null}
      </div>

      {saved ? (
        <p className="text-sm text-muted">
          The host link is only shown here, right after approving. It lets anyone who has it edit or cancel the event,
          so only share it with {hostName}.
        </p>
      ) : (
        <p className="text-sm text-muted">For safety, the host link is only shown right after approving.</p>
      )}

      <div className="flex flex-col justify-center gap-3 border-t border-border pt-6 sm:flex-row">
        <ButtonLink href="/admin/events" variant="secondary">
          Back to events
        </ButtonLink>
        <ButtonLink href={`/admin/events/${id}`} variant="ghost">
          See event details
        </ButtonLink>
      </div>
    </div>
  );
}
