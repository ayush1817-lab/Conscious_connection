import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getEventsOverview } from "@/lib/events/overview";
import { emailConfig } from "@/lib/email/service";
import { plural } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// A1 – Admin home
export default async function AdminHome() {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [admin, overview, { count: failedEmails }, { count: storiesWaiting }, { count: photosWaiting }] = await Promise.all([
    requireAdmin(),
    getEventsOverview(),
    supabase.from("email_log").select("id", { count: "exact", head: true }).is("sent_at", null).gte("created_at", weekAgo),
    supabase.from("story_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("gallery_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const { newRequests, attention } = overview.counts;
  const notSending = emailConfig().mode === "missing_key";

  return (
    <div className="py-4 sm:py-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Welcome, {admin.displayName}</h1>
        <p className="mt-2 text-muted">What would you like to do today?</p>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        <HomeCard href="/admin/events" title="Events" icon={<CalendarIcon />}>
          {plural(newRequests, "new request")} · {attention} need{attention === 1 ? "s" : ""} attention
        </HomeCard>
        <HomeCard href="/admin/content" title="Website content" icon={<PageIcon />}>
          {storiesWaiting || photosWaiting ? (
            <span className="font-medium text-text">
              {[storiesWaiting ? plural(storiesWaiting, "shared story", "shared stories") : null, photosWaiting ? plural(photosWaiting, "photo") : null]
                .filter(Boolean)
                .join(" and ")}{" "}
              to review.
            </span>
          ) : (
            "Update homepage, stories, podcasts, gallery and about."
          )}
        </HomeCard>
        <HomeCard href="/admin/email" title="Emails" icon={<MailIcon />}>
          {notSending ? (
            <span className="font-medium text-danger">Emails aren&apos;t being sent. Open to fix.</span>
          ) : failedEmails ? (
            <span className="font-medium text-danger">{plural(failedEmails, "email")} not sent this week.</span>
          ) : (
            "Check emails are working and send a test."
          )}
        </HomeCard>
      </div>
    </div>
  );
}

function HomeCard({ href, title, icon, children }: { href: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-card border border-border bg-surface p-6 shadow-sm transition-colors hover:border-primary"
    >
      <span className="text-primary">{icon}</span>
      <span className="flex-1">
        <span className="block text-xl font-semibold">{title}</span>
        <span className="mt-1 block text-muted">{children}</span>
      </span>
      <span aria-hidden className="text-2xl text-muted group-hover:text-primary">›</span>
    </Link>
  );
}

function CalendarIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function PageIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 11h7M9 15h7M9 7h4" />
    </svg>
  );
}
