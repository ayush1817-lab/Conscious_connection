import { readFileSync } from "node:fs";
import type { Page } from "playwright-core";
import { check } from "./browser";

const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
type Violation = { id: string; impact: string; help: string; nodes: { target: string[] }[] };

// Runs axe-core (WCAG 2.1 AA + best practice) on the current page and records one check.
export async function axe(page: Page, label: string) {
  await page.addScriptTag({ content: AXE });
  const violations = (await page.evaluate(async () => {
    const result = await (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: unknown[] }> } }).axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    });
    return result.violations;
  })) as Violation[];
  const detail = violations
    .map((v) => `${v.impact} ${v.id}: ${v.help} [${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}]`)
    .join("; ");
  check(violations.length === 0, `${label}: no accessibility problems`, detail);
}
