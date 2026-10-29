import Link from "next/link";
import { logout } from "@/app/admin/(app)/actions";
import { BrandMark } from "@/components/public/brand-mark";
import { AdminNav } from "./admin-nav";

// The admin's header: the same lavender bar, mark and font as the website's,
// with the admin sections and a link to the website itself.
export function TopBar({ displayName }: { displayName: string }) {
  return (
    <header className="admin-top-bar site-header border-b border-border">
      <div className="admin-top-bar-inner mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/admin" className="site-wordmark flex min-h-tap items-center font-heading font-semibold whitespace-nowrap text-primary">
          <BrandMark />
          <span className="hidden sm:inline">Conscious Connections</span>
          <span className="admin-pill">Admin</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <a href="/" target="_blank" rel="noreferrer" className="admin-view-site">
            View website<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <span className="hidden text-muted lg:inline">{displayName}</span>
          <form action={logout}>
            <button type="submit" className="min-h-tap rounded-control px-3 font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline">
              Log out
            </button>
          </form>
        </div>
        <AdminNav />
      </div>
    </header>
  );
}
