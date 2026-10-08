"use client";

import { useRef } from "react";
import { COUNTIES } from "@/lib/counties";
import type { When } from "@/lib/public/events";

const WHEN_OPTIONS: { value: When; label: string }[] = [
  { value: "all", label: "All upcoming" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

// A plain GET form, so filters work without JavaScript and are shareable links
// (/events?county=clare&when=month). With JavaScript, changing a filter applies it at once.
export function EventFilters({ county, when }: { county: string; when: When }) {
  const formRef = useRef<HTMLFormElement>(null);
  const selectClass =
    "min-h-tap w-full rounded-control border border-control-border bg-surface px-3 text-text sm:w-56";

  return (
    <form ref={formRef} action="/events" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-end">
      <div>
        <label htmlFor="filter-county" className="mb-1 block font-medium">
          County
        </label>
        <select id="filter-county" name="county" defaultValue={county} className={selectClass} onChange={() => formRef.current?.requestSubmit()}>
          <option value="">All counties</option>
          {COUNTIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filter-when" className="mb-1 block font-medium">
          When
        </label>
        <select id="filter-when" name="when" defaultValue={when} className={selectClass} onChange={() => formRef.current?.requestSubmit()}>
          {WHEN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" className="min-h-tap rounded-control bg-primary px-5 font-medium text-on-primary hover:bg-primary-hover">
          Show events
        </button>
        {county || when !== "all" ? (
          <a href="/events" className="flex min-h-tap items-center font-medium text-primary underline underline-offset-4">
            Clear filters
          </a>
        ) : null}
      </div>
    </form>
  );
}
