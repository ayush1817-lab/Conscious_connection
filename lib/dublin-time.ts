// Converting between Irish wall-clock time and UTC, for date filters and forms.
// The database stores UTC; people think in Europe/Dublin (spec section 5).
const TZ = "Europe/Dublin";

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

// The Irish calendar date and time of an instant.
export function dublinParts(date: Date) {
  const parts = Object.fromEntries(partsFmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday), // 0 = Monday
  };
}

// The instant when the clock in Ireland shows this date and time.
// Month is 1-12; day may overflow (e.g. 32 rolls into the next month).
export function dublinToUtc(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Irish offset at that moment (0 in winter, +1 in summer), found by formatting the guess.
  const p = dublinParts(new Date(guess));
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - guess;
  return new Date(guess - offset);
}

// Start of next Monday in Ireland: the end of "this week".
export function endOfDublinWeek(now = new Date()) {
  const p = dublinParts(now);
  return dublinToUtc(p.year, p.month, p.day + (7 - p.weekday));
}

// Start of the 1st of next month in Ireland: the end of "this month".
export function endOfDublinMonth(now = new Date()) {
  const p = dublinParts(now);
  return dublinToUtc(p.year, p.month + 1, 1);
}

// "2026-11-14" and "11:00" from a form -> UTC Date, or null if invalid.
export function parseDublinDateTime(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [year, month, day, hour, minute] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const result = dublinToUtc(year, month, day, hour, minute);
  // Reject dates like 31 February, which would roll over.
  const check = dublinParts(result);
  return check.day === day && check.month === month ? result : null;
}

// UTC ISO -> { date: "2026-11-14", time: "11:00" } in Irish time, for form fields.
export function toDublinInputs(iso: string) {
  const p = dublinParts(new Date(iso));
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}
