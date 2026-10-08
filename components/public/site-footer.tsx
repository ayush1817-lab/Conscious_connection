import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="font-heading text-lg font-semibold text-primary">Conscious Connections</p>
          <p className="mt-1 text-muted">A community for women and non-binary people across rural Ireland.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-2 gap-y-1">
            {[
              { href: "/events", label: "Events" },
              { href: "/submit-event", label: "Host an event" },
              { href: "/about", label: "About" },
              { href: "/privacy", label: "Privacy" },
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="flex min-h-tap items-center px-2 font-medium underline-offset-4 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
