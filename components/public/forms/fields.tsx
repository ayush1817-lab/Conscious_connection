import type { ComponentProps, ReactNode } from "react";
import { HONEYPOT_FIELD_NAME } from "./honeypot-name";

// Form fields for the public site: visible label, optional hint, and an error
// linked to the field (aria-describedby + aria-invalid) as the spec requires.

function describedBy(id: string, hint?: ReactNode, error?: string) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={`${id}-error`} className="mt-1 font-medium text-danger">
      {error}
    </p>
  ) : null;
}

const control =
  "w-full rounded-control border border-control-border bg-surface px-3 text-text placeholder:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:border-2";

export function InputField({
  label,
  id,
  hint,
  error,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; id: string; hint?: ReactNode; error?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
        {props.required ? null : <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mb-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`min-h-tap ${control}`}
        {...props}
      />
      <FieldError id={id} error={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  id,
  hint,
  error,
  className = "",
  ...props
}: ComponentProps<"textarea"> & { label: string; id: string; hint?: ReactNode; error?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
        {props.required ? null : <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mb-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <textarea
        id={id}
        name={id}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`py-2 ${control}`}
        {...props}
      />
      <FieldError id={id} error={error} />
    </div>
  );
}

export function SelectField({
  label,
  id,
  hint,
  error,
  className = "",
  children,
  ...props
}: ComponentProps<"select"> & { label: string; id: string; hint?: ReactNode; error?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mb-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <select
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`min-h-tap ${control}`}
        {...props}
      >
        {children}
      </select>
      <FieldError id={id} error={error} />
    </div>
  );
}

export function ConsentField({ id, error, defaultChecked, children }: { id: string; error?: string; defaultChecked?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={id}
          type="checkbox"
          value="yes"
          required
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-6 w-6 shrink-0 accent-primary"
        />
        <label htmlFor={id} className="min-h-tap">
          {children}
        </label>
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
}

// Hidden from people (and screen readers); bots that fill every field reveal themselves.
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={HONEYPOT_FIELD_NAME}>Leave this empty</label>
      <input id={HONEYPOT_FIELD_NAME} name={HONEYPOT_FIELD_NAME} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-control border-2 border-danger bg-surface p-4 font-medium text-danger">
      {children}
    </div>
  );
}
