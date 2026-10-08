import { isCounty } from "@/lib/counties";
import { parseDublinDateTime, toDublinInputs } from "@/lib/dublin-time";
import { checkEmail, checkPhone, checkText, field, type FieldErrors } from "./validate";

// The host event form (H1, and H3 when editing): field names, limits and
// server-side validation, shared by submitting and editing.

export const LIMITS = {
  title: 120,
  description: 500,
  capacityMax: 500,
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
  exact_address: string;
  host_name: string;
  host_email: string;
  host_phone: string;
  about_group: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
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
  exact_address: "",
  host_name: "",
  host_email: "",
  host_phone: "",
  about_group: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
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
};
export type PrivateFields = {
  exact_address: string;
  host_name: string;
  host_email: string;
  host_phone: string;
  about_group: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

export function readEventForm(formData: FormData): EventFormValues {
  const values = { ...EMPTY_EVENT_FORM };
  for (const key of Object.keys(values) as (keyof EventFormValues)[]) values[key] = field(formData, key);
  values.host_email = values.host_email.toLowerCase();
  return values;
}

// Posters uploaded from the public form must be at a path the server handed out.
export function isSubmittedPosterPath(path: string) {
  return new RegExp(`^${POSTER_FOLDER}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path);
}

export function validateEventForm(
  v: EventFormValues,
  { now = new Date(), currentPoster = null }: { now?: Date; currentPoster?: string | null } = {},
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
  if (start && start <= now && !errors.date) errors.date = "The event must be in the future.";

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

  set("exact_address", checkText(v.exact_address, "the exact address", LIMITS.address));
  set("host_name", checkText(v.host_name, "your name", LIMITS.name));
  set("host_email", checkEmail(v.host_email));
  set("host_phone", checkPhone(v.host_phone, "your phone number"));
  set("about_group", checkText(v.about_group, "a little about your group", LIMITS.about));
  set("emergency_contact_name", checkText(v.emergency_contact_name, "an emergency contact name", LIMITS.name));
  set("emergency_contact_phone", checkPhone(v.emergency_contact_phone, "an emergency contact phone number"));

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
    },
    details: {
      exact_address: v.exact_address,
      host_name: v.host_name,
      host_email: v.host_email,
      host_phone: v.host_phone,
      about_group: v.about_group,
      emergency_contact_name: v.emergency_contact_name,
      emergency_contact_phone: v.emergency_contact_phone,
    },
  };
}

// Database rows -> form values, for editing an existing event.
export function eventToForm(event: EventFields, details: PrivateFields): EventFormValues {
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
    ...details,
  };
}
