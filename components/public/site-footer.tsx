import Link from "next/link";
import { BrandMark, ConnectionLoops } from "./brand-mark";
import { Doodle } from "./doodles";

const EXPLORE = [
  { href: "/events", label: "Events" },
  { href: "/stories", label: "Stories & Poetry" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/gallery", label: "Gallery" },
];
const MORE = [
  { href: "/submit-event", label: "Host an event" },
  { href: "/about", label: "About" },
  { href: "/guidelines", label: "Community Guidelines" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer mt-10">
      <ConnectionLoops className="footer-loops" />
      <Doodle name="sparkle" tone="lilac" className="footer-doodle footer-doodle-1" />
      <Doodle name="heart" tone="orchid" className="footer-doodle footer-doodle-2" />
      <div className="site-footer-inner mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="footer-brand"><BrandMark /><p className="font-heading text-lg font-semibold">Conscious Connections</p></div>
          <p className="footer-description">A community for LGBTQ+ women and non-binary people across the island of Ireland.</p>
        </div>
        <nav aria-label="Footer" className="footer-nav">
          {[
            { title: "Explore", links: EXPLORE },
            { title: "More", links: MORE },
          ].map((col) => (
            <div key={col.title}>
              <p className="footer-nav-title">{col.title}</p>
              <ul>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="flex min-h-tap items-center font-medium underline-offset-4 hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <p aria-hidden className="footer-wordmark mx-auto max-w-6xl px-4">
        Conscious Connections
      </p>
    </footer>
  );
}
