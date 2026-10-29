import Link from "next/link";
import { Doodle } from "@/components/public/doodles";
import { Illustration, type IllustrationName } from "@/components/public/illustrations";
import { Eyebrow } from "@/components/public/section-heading";
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
    <div className="space-y-8">
      <section className="admin-welcome">
        <Doodle name="sparkle" tone="primary" className="admin-welcome-spark" />
        <Doodle name="heart" tone="orchid" className="admin-welcome-heart" />
        <div className="admin-welcome-copy">
          <Eyebrow>Admin</Eyebrow>
          <h1 className="font-heading text-3xl font-semibold md:text-4xl">Welcome, {admin.displayName}</h1>
          <p className="mt-2 text-lg text-muted">What would you like to do today?</p>
        </div>
        <Illustration name="community" className="admin-welcome-art" />
      </section>

      <ul className="admin-home-cards grid gap-5 md:grid-cols-3">
        <HomeCard href="/admin/events" title="Events" art="map" tone={1}>
          {plural(newRequests, "new request")} · {attention} need{attention === 1 ? "s" : ""} attention
        </HomeCard>
        <HomeCard href="/admin/content" title="Website content" art="story" tone={2}>
          {storiesWaiting || photosWaiting ? (
            <span className="font-medium text-text">
              {[storiesWaiting ? plural(storiesWaiting, "shared story", "shared stories") : null, photosWaiting ? plural(photosWaiting, "photo") : null]
                .filter(Boolean)
                .join(" and ")}{" "}
              to review.
            </span>
          ) : (
            "Change the words and photos on every page, with a live preview."
          )}
        </HomeCard>
        <HomeCard href="/admin/email" title="Emails" art="hearts" tone={3}>
          {notSending ? (
            <span className="font-medium text-danger">Emails aren&apos;t being sent. Open to fix.</span>
          ) : failedEmails ? (
            <span className="font-medium text-danger">{plural(failedEmails, "email")} not sent this week.</span>
          ) : (
            "Check emails are working and send a test."
          )}
        </HomeCard>
      </ul>
    </div>
  );
}

// Tinted cards with a drawing, like the "What we're about" cards on the website.
function HomeCard({ href, title, art, tone, children }: { href: string; title: string; art: IllustrationName; tone: 1 | 2 | 3; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className={`admin-home-card home-value home-value-${tone} group`}>
        <Illustration name={art} className="home-value-art" />
        <span className="flex items-center justify-between gap-2">
          <span className="font-heading text-xl font-semibold">{title}</span>
          <span aria-hidden className="admin-home-card-arrow">→</span>
        </span>
        <span className="text-text">{children}</span>
      </Link>
    </li>
  );
}
