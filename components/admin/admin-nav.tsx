"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Home" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/content", label: "Website content" },
  { href: "/admin/email", label: "Emails" },
];

export function AdminNav() {
  const pathname = usePathname();
  const current = (href: string) => (href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)) || (href === "/admin/events" && pathname.startsWith("/admin/attention"));
  return (
    <nav aria-label="Admin" className="admin-nav">
      <ul>
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} aria-current={current(link.href) ? "page" : undefined}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
