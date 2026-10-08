// Small server-side validation helpers for public forms. Limits match the
// database (see the migrations); every form is checked again on the server.

export type FieldErrors = Record<string, string>;

// Browsers send textarea line breaks as \r\n; store plain \n.
export function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkEmail(value: string): string | null {
  if (!value) return "Enter your email address.";
  if (value.length > 254 || !EMAIL.test(value)) return "Enter an email address like name@example.com.";
  return null;
}

export function checkText(value: string, label: string, max: number, required = true): string | null {
  if (required && !value) return `Enter ${label}.`;
  if (value.length > max) return `This can be up to ${max} characters (it's ${value.length}).`;
  return null;
}

export function checkPhone(value: string, label: string): string | null {
  if (!value) return `Enter ${label}.`;
  if (value.length > 30 || !/^\+?[0-9 ()-]{6,}$/.test(value)) return "Enter a phone number using digits, like 087 123 4567.";
  return null;
}
