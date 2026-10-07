import { chromium, type Browser } from "playwright-core";

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Uses CHROMIUM_PATH if set, otherwise Playwright's installed Chromium.
export function launch(): Promise<Browser> {
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
}

let failures = 0;
export function check(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${!ok && detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

export function finish() {
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}
