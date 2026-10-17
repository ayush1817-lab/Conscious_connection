import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { BackgroundWaves } from "@/components/public/background-waves";

// Every public page reads the database on each request, so the admin's edits in
// the admin show up straight away (spec section 5, "Freshness").
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-site flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-4 py-3 font-medium text-primary shadow-lg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <BackgroundWaves />
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
