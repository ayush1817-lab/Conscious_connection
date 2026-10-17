import { isCounty } from "@/lib/counties";
import { parseDublinDateTime, toDublinInputs } from "@/lib/dublin-time";
import { repeatsOf, WEEKLY, type RecurrenceRule } from "@/lib/events/recurrence";
import { checkEmail, checkPhone, checkText, field, type FieldErrors } from "./validate";

// The host event form (H1, and H3 when editing): field names, limits and
// server-side validation, shared by submitting and editing.

export const LIMITS = {
  title: 120,
  description: 500,
  capacityMax: 500,
  url: 2000,
  address: 300,
  name: 100,
  about: 300,
} as const;

export const POSTER_FOLDER = "submissions";

// What the form sends, as strings (also what it is refilled with after an error).
export type EventFormValues = {
  title: string;
  county: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  poster_path: string;
  capacity: string;
  // "none" or "weekly"; repeat_until is the optional last date (YYYY-MM-DD).
  repeats: string;
  repeat_until: string;
  // Optional: people register on another website instead of ours.
  external_registration_url: string;
  exact_address: string;
  host_name: string;
  host_email: string;
  host_phone: string;
  about_group: string;
};

export const EMPTY_EVENT_FORM: EventFormValues = {
  title: "",
  county: "",
  date: "",
  start_time: "",
  end_time: "",
  description: "",
  poster_path: "",
  capacity: "",
  repeats: "none",
  repeat_until: "",
  external_registration_url: "",
  exact_address: "",
  host_name: "",
  host_email: "",
  host_phone: "",
  about_group: "",
};

// Database-ready values.
export type EventFields = {
  title: string;
  county: string;
  start_at: string;
  end_at: string;
  description: string;
  poster_path: string | null;
  capacity: number | null;
  recurrence_rule: RecurrenceRule | null;
  recurrence_until: string | null;
  external_registration_url: string | null;
};
export type PrivateFields = {
  exact_address: string;
  host_name: string;
  host_email: string;
  host_phone: string;
  about_group: string;
};

export function readEventForm(formData: FormData): EventFormValues {
  const values = { ...EMPTY_EVENT_FORM };
  for (const key of Object.keys(values) as (keyof EventFormValues)[]) values[key] = field(formData, key);
  values.repeats ||= "none";
  if (values.repeats !== "weekly") values.repeat_until = "";
  values.host_email = values.host_email.toLowerCase();
  return values;
}

// Posters uploaded from the public form must be at a path the server handed out.
export function isSubmittedPosterPath(path: string) {
  return new RegExp(`^${POSTER_FOLDER}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path);
}

export function validateEventForm(
  v: EventFormValues,
  {
    now = new Date(),
    currentPoster = null,
    currentStart = null,
  }: { now?: Date; currentPoster?: string | null; currentStart?: string | null } = {},
): { errors: FieldErrors; event?: EventFields; details?: PrivateFields } {
  const errors: FieldErrors = {};
  const set = (key: keyof EventFormValues, message: string | null) => {
    if (message) errors[key] = message;
  };

  set("title", checkText(v.title, "a title", LIMITS.title));
  if (!v.county) errors.county = "Choose a county.";
  else if (!isCounty(v.county)) errors.county = "Choose a county from the list.";

  const start = v.date && v.start_time ? parseDublinDateTime(v.date, v.start_time) : null;
  const end = v.date && v.end_time ? parseDublinDateTime(v.date, v.end_time) : null;
  if (!v.date) errors.date = "Choose a date.";
  else if (!parseDublinDateTime(v.date, "12:00")) errors.date = "Enter a real date.";
  if (!v.start_time) errors.start_time = "Choose a start time.";
  else if (v.date && !start) errors.start_time = "Enter a time like 11:00.";
  if (!v.end_time) errors.end_time = "Choose an end time.";
  else if (v.date && !end) errors.end_time = "Enter a time like 13:00.";
  if (start && end && end <= start) errors.end_time = "The end time must be after the start time.";
  // Editing: keeping the current start (say, of a weekly event that has begun) is fine.
  const keptStart = start && currentStart && start.getTime() === new Date(currentStart).getTime();
  if (start && start <= now && !keptStart && !errors.date) errors.date = "The event must be in the future.";

  let recurrence: RecurrenceRule | null = null;
  let until: string | null = null;
  if (v.repeats === "weekly") recurrence = WEEKLY;
  else if (v.repeats && v.repeats !== "none") errors.repeats = "Choose how often the event repeats.";
  if (recurrence && v.repeat_until) {
    if (!parseDublinDateTime(v.repeat_until, "12:00")) errors.repeat_until = "Enter a real date, or leave it empty.";
    else if (v.date && v.repeat_until < v.date) errors.repeat_until = "The last date can't be before the first date.";
    else until = v.repeat_until;
  }

  set("description", checkText(v.description, "a description", LIMITS.description));

  let capacity: number | null = null;
  if (v.capacity) {
    capacity = Number(v.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > LIMITS.capacityMax) {
      errors.capacity = `Enter a whole number from 1 to ${LIMITS.capacityMax}, or leave it empty for no limit.`;
    }
  }

  let poster: string | null = v.poster_path || null;
  if (poster && poster !== currentPoster && !isSubmittedPosterPath(poster)) {
    errors.poster_path = "That poster couldn't be used. Please upload it again.";
    poster = null;
  }

  const externalUrl = v.external_registration_url ? normaliseUrl(v.external_registration_url) : null;
  if (v.external_registration_url && !externalUrl) {
    errors.external_registration_url = "Enter a full web address, like https://www.eventbrite.ie/…";
  } else if (externalUrl && externalUrl.length > LIMITS.url) {
    errors.external_registration_url = "That link is too long.";
  }

  set("exact_address", checkText(v.exact_address, "the exact address", LIMITS.address));
  set("host_name", checkText(v.host_name, "your name", LIMITS.name));
  set("host_email", checkEmail(v.host_email));
  set("host_phone", checkPhone(v.host_phone, "your phone number"));
  set("about_group", checkText(v.about_group, "a little about your group", LIMITS.about));

  if (Object.keys(errors).length || !start || !end) return { errors };
  return {
    errors,
    event: {
      title: v.title,
      county: v.county,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      description: v.description,
      poster_path: poster,
      capacity,
      recurrence_rule: recurrence,
      recurrence_until: until,
      external_registration_url: externalUrl,
    },
    details: {
      exact_address: v.exact_address,
      host_name: v.host_name,
      host_email: v.host_email,
      host_phone: v.host_phone,
      about_group: v.about_group,
    },
  };
}

// Database rows -> form values, for editing an existing event.
export function eventToForm(
  event: Omit<EventFields, "recurrence_rule"> & { recurrence_rule: unknown },
  details: PrivateFields,
): EventFormValues {
  const start = toDublinInputs(event.start_at);
  return {
    title: event.title,
    county: event.county,
    date: start.date,
    start_time: start.time,
    end_time: toDublinInputs(event.end_at).time,
    description: event.description,
    poster_path: event.poster_path ?? "",
    capacity: event.capacity === null ? "" : String(event.capacity),
    repeats: repeatsOf(event.recurrence_rule),
    repeat_until: event.recurrence_until ?? "",
    external_registration_url: event.external_registration_url ?? "",
    ...details,
  };
}

// "eventbrite.ie/e/123" -> "https://eventbrite.ie/e/123". Only http(s) links
// to a real-looking host are accepted (never javascript: and the like).
export function normaliseUrl(input: string): string | null {
  const trimmed = input.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!/^[^.\s]+(\.[^.\s]+)+$/.test(url.hostname)) return null; // needs a dot, e.g. example.com
  return url.toString();
}
