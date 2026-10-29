"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/content/homepage", label: "Homepage" },
  { href: "/admin/content/stories", label: "Stories" },
  { href: "/admin/content/podcasts", label: "Podcasts" },
  { href: "/admin/content/gallery", label: "Gallery" },
  { href: "/admin/content/about", label: "About" },
  { href: "/admin/content/guidelines", label: "Guidelines" },
  { href: "/admin/content/pages", label: "Other pages" },
];

export function ContentTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Website content" className="content-tabs -mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-2">
        {TABS.map((tab) => {
          const current = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className="content-tab"
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
