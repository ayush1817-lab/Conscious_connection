"use client";

import Link from "next/link";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { useUnsavedChanges } from "@/components/content/use-unsaved-changes";
import { COUNTY_NAMES } from "@/lib/counties";
import { LIMITS, type EventFormValues } from "@/lib/public/event-form";
import type { FieldErrors } from "@/lib/public/validate";
import { ConsentField, FormAlert, Honeypot, InputField, SelectField, TextAreaField } from "./forms/fields";
import { useFocusFirstError } from "./forms/use-focus-first-error";
import { EyeIcon, LockIcon } from "./icons";
import { PosterUpload } from "./poster-upload";

export type EventFormState = { error?: string; notice?: string; fieldErrors?: FieldErrors; values?: EventFormValues; consent?: boolean };

// The host event form: H1 (submit), and H3 when a host fixes or edits their event.
// Public details and private details are visibly separate (spec section 8).
export function EventForm({
  action,
  initial,
  submitLabel,
  pendingLabel,
  withConsent = true,
  locked = [],
  lockedNote,
  footnote,
}: {
  action: (prev: EventFormState, formData: FormData) => Promise<EventFormState>;
  initial: EventFormValues;
  submitLabel: string;
  pendingLabel: string;
  withConsent?: boolean;
  // Fields that can't be changed (shown read-only with a lock icon).
  locked?: (keyof EventFormValues)[];
  lockedNote?: ReactNode;
  footnote?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  useFocusFirstError(formRef, state);
  useUnsavedChanges(dirty && !pending);

  const v = state.values ?? initial;
  const e = state.fieldErrors ?? {};
  const isLocked = (key: keyof EventFormValues) => locked.includes(key);
  const lockHint = (key: keyof EventFormValues) =>
    isLocked(key) ? (
      <span className="inline-flex items-center gap-1">
        <LockIcon size={14} /> Can&apos;t be changed
      </span>
    ) : undefined;
  // React keeps uncontrolled inputs' values; a new key after each server reply
  // refills the form with what the server sent back.
  const formKey = JSON.stringify(state.values ?? null);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });

  return (
    <form
      ref={formRef}
      key={formKey}
      action={formAction}
      noValidate
      onChange={() => setDirty(true)}
      className="relative space-y-8"
    >
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      {state.notice ? (
        <div role="status" className="rounded-control border border-border bg-surface p-4 font-medium">
          {state.notice}
        </div>
      ) : null}

      <fieldset className="space-y-5 rounded-card border border-border bg-surface p-5 md:p-6">
        <legend className="flex items-center gap-2 px-1 font-heading text-xl font-semibold">
          <EyeIcon className="text-accent" />
          1. Event details
        </legend>
        <p className="-mt-2 text-muted">Visible to everyone on the website.</p>

        {lockedNote && locked.length ? (
          <p className="flex items-start gap-2 rounded-control bg-band p-3">
            <LockIcon className="mt-0.5 shrink-0" />
            <span>{lockedNote}</span>
          </p>
        ) : null}

        <InputField id="title" label="Event title" required maxLength={LIMITS.title} placeholder="e.g. Coffee meetup, hill walk, book club" defaultValue={v.title} error={e.title} />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField id="county" label="County" required defaultValue={v.county} error={e.county} disabled={isLocked("county")} hint={lockHint("county")}>
            <option value="">Select a county</option>
            {COUNTY_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectField>
          <InputField id="date" label="Date" type="date" required min={today} defaultValue={v.date} error={e.date} readOnly={isLocked("date")} hint={lockHint("date")} />
          <InputField id="start_time" label="Start time" type="time" required defaultValue={v.start_time} error={e.start_time} readOnly={isLocked("start_time")} hint={lockHint("start_time")} />
          <InputField id="end_time" label="End time" type="time" required defaultValue={v.end_time} error={e.end_time} readOnly={isLocked("end_time")} hint={lockHint("end_time")} />
        </div>
        {/* A disabled select isn't sent with the form, so send the locked county separately. */}
        {isLocked("county") ? <input type="hidden" name="county" value={v.county} /> : null}
        <TextAreaField
          id="description"
          label="Description"
          required
          maxLength={LIMITS.description}
          hint={`Tell people what to expect, what to bring and anything about access. Up to ${LIMITS.description} characters.`}
          placeholder="A relaxed walk at an easy pace, followed by tea…"
          defaultValue={v.description}
          error={e.description}
        />
        <InputField
          id="capacity"
          label="How many people can come?"
          type="number"
          inputMode="numeric"
          min={1}
          max={LIMITS.capacityMax}
          hint="Leave empty if there's no limit."
          defaultValue={v.capacity}
          error={e.capacity}
          className="sm:max-w-xs"
        />
        <PosterUpload defaultPath={v.poster_path} error={e.poster_path} onChange={() => setDirty(true)} />
      </fieldset>

      <fieldset className="space-y-5 rounded-card border-2 border-private-border bg-private p-5 md:p-6">
        <legend className="flex items-center gap-2 rounded-control bg-private px-1 font-heading text-xl font-semibold">
          <LockIcon className="text-primary" />
          2. Private details
        </legend>
        <p className="-mt-2">
          <strong>Only visible to Karina.</strong> These are never shown on the website.
        </p>
        <TextAreaField
          id="exact_address"
          label="Exact address"
          required
          rows={2}
          maxLength={LIMITS.address}
          hint={isLocked("exact_address") ? lockHint("exact_address") : "Never shown publicly. We email it only to people who register."}
          defaultValue={v.exact_address}
          error={e.exact_address}
          readOnly={isLocked("exact_address")}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField id="host_name" label="Your name" required maxLength={LIMITS.name} autoComplete="name" defaultValue={v.host_name} error={e.host_name} />
          <InputField id="host_email" label="Your email" type="email" required maxLength={254} autoComplete="email" inputMode="email" defaultValue={v.host_email} error={e.host_email} />
          <InputField id="host_phone" label="Your phone" type="tel" required maxLength={30} autoComplete="tel" defaultValue={v.host_phone} error={e.host_phone} />
        </div>
        <TextAreaField
          id="about_group"
          label="About you or your group"
          required
          rows={3}
          maxLength={LIMITS.about}
          hint={`Helps Karina get to know who's hosting. Up to ${LIMITS.about} characters.`}
          defaultValue={v.about_group}
          error={e.about_group}
        />
        <div>
          <p className="font-medium">Emergency contact</p>
          <p className="mb-2 text-sm text-muted">Only used if something goes wrong on the day.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField id="emergency_contact_name" label="Name" required maxLength={LIMITS.name} defaultValue={v.emergency_contact_name} error={e.emergency_contact_name} />
            <InputField id="emergency_contact_phone" label="Phone" type="tel" required maxLength={30} defaultValue={v.emergency_contact_phone} error={e.emergency_contact_phone} />
          </div>
        </div>
      </fieldset>

      {withConsent ? (
        <div className="space-y-3">
          <p className="text-muted">
            Karina uses these details only to review and run your event. Private details are deleted 7 days after the event.{" "}
            <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">
              Privacy
            </Link>
          </p>
          <ConsentField id="consent" defaultChecked={state.consent} error={e.consent}>
            I agree to Conscious Connections storing these details to review and run my event.
          </ConsentField>
        </div>
      ) : null}

      <Honeypot />
      {footnote ? <p className="text-muted">{footnote}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-tap w-full rounded-control bg-primary px-6 font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60 sm:w-auto"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
