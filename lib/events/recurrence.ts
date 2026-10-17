// Recurring events (client feedback, Oct 2026). Mirrors the SQL functions in
// supabase/migrations/20261017000300_recurring_events.sql.
//
// A rule is stored as JSON on events.recurrence_rule. Today only weekly is
// offered; the shape leaves room for fortnightly ({freq:"weekly", interval:2})
// and monthly (a new freq) once those are agreed.
import { dublinParts, dublinToUtc } from "@/lib/dublin-time";

export type RecurrenceRule = { freq: "weekly"; interval: 1 };
export const WEEKLY: RecurrenceRule = { freq: "weekly", interval: 1 };

export type Repeats = "none" | "weekly";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Reads a stored rule; anything the site doesn't support counts as one-off.
export function parseRule(value: unknown): RecurrenceRule | null {
  if (!value || typeof value !== "object") return null;
  const rule = value as { freq?: unknown; interval?: unknown };
  if (rule.freq === "weekly" && (rule.interval === undefined || rule.interval === 1)) return WEEKLY;
  return null;
}

export function repeatsOf(value: unknown): Repeats {
  return parseRule(value) ? "weekly" : "none";
}

function stepDays(rule: RecurrenceRule) {
  return 7 * rule.interval;
}

// Start of occurrence k (0 = the first), keeping the Irish wall-clock time.
export function occurrenceStart(startIso: string, rule: RecurrenceRule | null, k: number): Date {
  const start = new Date(startIso);
  if (!rule) return start;
  const p = dublinParts(start);
  return dublinToUtc(p.year, p.month, p.day + stepDays(rule) * k, p.hour, p.minute);
}

// "2026-11-14" -> true when the occurrence's Irish date is on or before it.
function onOrBefore(date: Date, until: string | null) {
  if (!until) return true;
  const p = dublinParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}` <= until;
}

type Series = { start_at: string; end_at: string; recurrence_rule: unknown; recurrence_until: string | null };

// The next occurrences that haven't ended yet, soonest first.
export function upcomingOccurrences(event: Series, count: number, now = new Date()): { start: string; end: string }[] {
  const rule = parseRule(event.recurrence_rule);
  const duration = new Date(event.end_at).getTime() - new Date(event.start_at).getTime();
  if (!rule) {
    return new Date(event.end_at) > now ? [{ start: event.start_at, end: event.end_at }] : [];
  }
  const step = stepDays(rule) * 86_400_000;
  let k = Math.max(0, Math.floor((now.getTime() - new Date(event.end_at).getTime()) / step) - 1);
  const result: { start: string; end: string }[] = [];
  // Bounded loop: skip past occurrences, then collect `count` more.
  for (let guard = 0; guard < count + 10 && result.length < count; guard++, k++) {
    const start = occurrenceStart(event.start_at, rule, k);
    if (!onOrBefore(start, event.recurrence_until)) break;
    const end = new Date(start.getTime() + duration);
    if (end > now) result.push({ start: start.toISOString(), end: end.toISOString() });
  }
  return result;
}

// True when `iso` is one of the event's occurrence start times.
export function isOccurrence(event: Series, iso: string) {
  const rule = parseRule(event.recurrence_rule);
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return false;
  if (!rule) return at.getTime() === new Date(event.start_at).getTime();
  const k = Math.round((at.getTime() - new Date(event.start_at).getTime()) / (stepDays(rule) * 86_400_000));
  return k >= 0 && occurrenceStart(event.start_at, rule, k).getTime() === at.getTime() && onOrBefore(at, event.recurrence_until);
}

// "7pm", "7:30pm", "12pm"
function clock(hour: number, minute: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${hour < 12 ? "am" : "pm"}`;
}

const untilFmt = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// "Every Thursday, 7pm" (plus ", until 18 Dec 2026" when asked and there's an end date),
// or null for a one-off event.
export function describeRecurrence(event: Series, { withUntil = false } = {}): string | null {
  const rule = parseRule(event.recurrence_rule);
  if (!rule) return null;
  const p = dublinParts(new Date(event.start_at));
  let label = `Every ${WEEKDAYS[p.weekday]}, ${clock(p.hour, p.minute)}`;
  if (withUntil && event.recurrence_until) label += `, until ${untilFmt.format(new Date(`${event.recurrence_until}T00:00:00Z`))}`;
  return label;
}

// Registrations grouped by the date they're for, soonest date first.
export function groupByOccurrence<T extends { occurrence_start: string }>(rows: T[]): { start: string; rows: T[] }[] {
  const groups = new Map<number, { start: string; rows: T[] }>();
  for (const row of rows) {
    const key = new Date(row.occurrence_start).getTime();
    const group = groups.get(key) ?? { start: new Date(key).toISOString(), rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([, g]) => g);
}
