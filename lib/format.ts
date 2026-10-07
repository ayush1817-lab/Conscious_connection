// Dates and times are always shown in Irish time, whatever the server's timezone.
const TZ = "Europe/Dublin";

const dateFmt = new Intl.DateTimeFormat("en-IE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-IE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-IE", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IE", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// "Sat 14 Jun 2025"
export function formatDate(iso: string) {
  return dateFmt.format(new Date(iso)).replace(",", "");
}

// "Sat 14 Jun"
export function formatShortDate(iso: string) {
  return shortDateFmt.format(new Date(iso)).replace(",", "");
}

// "11:00–13:00"
export function formatTimeRange(startIso: string, endIso: string) {
  return `${timeFmt.format(new Date(startIso))}–${timeFmt.format(new Date(endIso))}`;
}

// "4 Jun 2025, 10:24"
export function formatDateTime(iso: string) {
  return dateTimeFmt.format(new Date(iso));
}

// "just now", "4 hours ago", "2 days ago"
export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en-IE", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (seconds >= size) return rtf.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
