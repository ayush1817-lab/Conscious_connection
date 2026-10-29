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
  const apply = () => formRef.current?.requestSubmit();

  return (
    <form ref={formRef} action="/events" className="event-filters flex flex-col gap-5 rounded-card border border-border p-5">
      <p className="font-heading text-lg font-semibold">Find your people</p>
      <div>
        <label htmlFor="filter-county" className="mb-1 block font-medium">
          County
        </label>
        <select
          id="filter-county"
          name="county"
          defaultValue={county}
          className="min-h-tap w-full rounded-control border border-control-border bg-surface px-3 text-text"
          onChange={apply}
        >
          <option value="">All counties</option>
          {COUNTIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="mb-2 font-medium">When</legend>
        <div className="when-chips flex flex-wrap gap-2">
          {WHEN_OPTIONS.map((o) => (
            <label key={o.value} className="when-chip">
              <input type="radio" name="when" value={o.value} defaultChecked={when === o.value} onChange={apply} className="sr-only" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
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
