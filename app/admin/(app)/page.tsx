import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getEventsOverview } from "@/lib/events/overview";
import { plural } from "@/lib/format";

// A1 – Admin home
export default async function AdminHome() {
  const [admin, overview] = await Promise.all([requireAdmin(), getEventsOverview()]);
  const { newRequests, attention } = overview.counts;

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
          Update homepage, stories, podcasts, gallery and about.
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

function PageIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 11h7M9 15h7M9 7h4" />
    </svg>
  );
}
