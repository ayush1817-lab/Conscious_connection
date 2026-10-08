"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "./icons";

export const NAV_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/stories", label: "Stories" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close the mobile menu when the page changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Link href="/" className="flex min-h-tap items-center font-heading text-lg font-semibold whitespace-nowrap text-primary">
          Conscious Connections
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className="flex min-h-tap items-center rounded-control px-3 font-medium hover:bg-hero aria-[current=page]:text-primary aria-[current=page]:underline aria-[current=page]:underline-offset-8"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/submit-event"
            className="hidden min-h-tap items-center rounded-control bg-primary px-4 font-medium text-on-primary hover:bg-primary-hover sm:inline-flex"
          >
            Host an event
          </Link>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-control md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-border bg-surface md:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className="flex min-h-tap items-center border-b border-border py-2 text-lg font-medium aria-[current=page]:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="py-3">
              <Link
                href="/submit-event"
                className="flex min-h-tap items-center justify-center rounded-control bg-primary px-4 font-medium text-on-primary hover:bg-primary-hover"
              >
                Host an event
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
