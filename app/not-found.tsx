import Link from "next/link";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

// Friendly 404 for any unknown address (spec section 4).
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start px-4 py-16">
        <h1 className="font-heading text-3xl font-semibold md:text-4xl">We can&apos;t find that page</h1>
        <p className="mt-3 text-lg text-muted">
          It may have moved, or the link might have a typo. Here are some places to start.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/events" className={buttonClass("primary")}>
            Find events
          </Link>
          <Link href="/" className={buttonClass("secondary")}>
            Go to the homepage
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
