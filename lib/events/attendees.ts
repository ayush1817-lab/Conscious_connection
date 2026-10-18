import { formatDate, formatDateTime, formatTimeRange } from "@/lib/format";

// The admin's attendee list for one event (client feedback, Oct 2026), and its
// CSV download. Hosts still see first names only.

export type Attendee = { name: string; email: string; occurrence_start: string; created_at: string };

// Spreadsheet apps run cells that start with = + - @ (or a tab/CR) as formulas;
// prefix them with ' so a name like "=HYPERLINK(...)" stays plain text.
function cell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function attendeesCsv(attendees: Attendee[], event: { start_at: string; end_at: string }) {
  const duration = new Date(event.end_at).getTime() - new Date(event.start_at).getTime();
  const header = ["Name", "Email", "Event date", "Time", "Registered"];
  const lines = attendees.map((a) => {
    const end = new Date(new Date(a.occurrence_start).getTime() + duration).toISOString();
    return [a.name, a.email, formatDate(a.occurrence_start), formatTimeRange(a.occurrence_start, end), formatDateTime(a.created_at)].map(cell).join(",");
  });
  // A byte-order mark so Excel reads names like Siobhán correctly.
  return `﻿${[header.join(","), ...lines].join("\r\n")}\r\n`;
}

// "attendees-sea-swim-sauna-2026-10-24.csv"
export function attendeesFilename(title: string, date?: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `attendees-${slug || "event"}${date ? `-${date}` : ""}.csv`;
}
