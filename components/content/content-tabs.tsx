"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/content/homepage", label: "Homepage" },
  { href: "/admin/content/stories", label: "Stories" },
  { href: "/admin/content/podcasts", label: "Podcasts" },
  { href: "/admin/content/gallery", label: "Gallery" },
  { href: "/admin/content/about", label: "About" },
];

export function ContentTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Website content" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {TABS.map((tab) => {
          const current = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`-mb-px inline-flex min-h-tap items-center border-b-2 px-4 font-medium ${
                  current ? "border-primary text-text" : "border-transparent text-muted hover:text-text"
                }`}
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
