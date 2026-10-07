import { formatDate, formatTimeRange } from "@/lib/format";

// Email templates (spec section 9). Each is written once as a list of blocks,
// which render to both a plain-text and a simple HTML version.

export type TemplateId = "E2" | "E3" | "E4";

export type RenderedEmail = { template: TemplateId; subject: string; text: string; html: string };

type Block =
  | { kind: "p"; text: string }
  | { kind: "quote"; label: string; text: string }
  | { kind: "details"; rows: [string, string][]; link?: { label: string; url: string } }
  | { kind: "button"; label: string; url: string }
  | { kind: "note"; text: string };

type EventSummary = { title: string; county: string; start_at: string; end_at: string };

const SIGN_OFF = "Thanks,\nConscious Connections";

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "there";
}

// E2: Karina requests changes.
export function needsChangesEmail(args: { hostName: string; event: EventSummary; reason: string; editUrl: string }) {
  return render("E2", "We need a few changes to your event", "We need a few changes", [
    { kind: "p", text: `Hi ${firstName(args.hostName)},` },
    { kind: "p", text: `Thanks for your event submission "${args.event.title}". Karina has asked for a few changes before it can go live.` },
    { kind: "quote", label: "Reason for changes", text: args.reason },
    { kind: "button", label: "Edit your event", url: args.editUrl },
    { kind: "p", text: "Once you've updated the details, we'll review it again." },
    { kind: "p", text: SIGN_OFF },
  ]);
}

// E3: Karina declines.
export function declinedEmail(args: { hostName: string; event: EventSummary; reason: string }) {
  return render("E3", "Your event won't be going live", "Your event won't be going live", [
    { kind: "p", text: `Hi ${firstName(args.hostName)},` },
    {
      kind: "p",
      text: `Thank you for submitting your event "${args.event.title}" and for wanting to bring people together. After reviewing the details, we've decided not to publish this event.`,
    },
    { kind: "quote", label: "Reason", text: args.reason },
    { kind: "p", text: "You're welcome to submit a different event in the future. If you have any questions, you can reply to this email." },
    { kind: "p", text: SIGN_OFF },
  ]);
}

// E4: Karina approves (or regenerates the host link).
export function approvedEmail(args: { hostName: string; event: EventSummary; eventUrl: string; hostUrl: string }) {
  const { event } = args;
  return render("E4", "Your event is now live!", "Your event is now live!", [
    { kind: "p", text: `Hi ${firstName(args.hostName)},` },
    { kind: "p", text: `Great news! Your event "${event.title}" is now live on the Conscious Connections website.` },
    {
      kind: "details",
      rows: [
        ["Event", event.title],
        ["When", `${formatDate(event.start_at)}, ${formatTimeRange(event.start_at, event.end_at)}`],
        ["Where", `${event.county} (only the county is shown publicly)`],
      ],
      link: { label: "View on website", url: args.eventUrl },
    },
    { kind: "button", label: "Manage your event", url: args.hostUrl },
    {
      kind: "p",
      text: "Use this private link to edit your event, see who has registered, request contact details, or cancel the event.",
    },
    {
      kind: "note",
      text: "Keep this email safe. The link above is the only way to manage your event, so please don't share it.",
    },
    { kind: "p", text: "Thanks for being part of the community,\nConscious Connections" },
  ]);
}

function render(template: TemplateId, subject: string, heading: string, blocks: Block[]): RenderedEmail {
  return { template, subject, text: renderText(heading, blocks), html: renderHtml(subject, heading, blocks) };
}

function renderText(heading: string, blocks: Block[]) {
  const parts = [heading];
  for (const b of blocks) {
    switch (b.kind) {
      case "p":
      case "note":
        parts.push(b.text);
        break;
      case "quote":
        parts.push(`${b.label}:\n"${b.text}"`);
        break;
      case "details":
        parts.push(
          [...b.rows.map(([k, v]) => `${k}: ${v}`), ...(b.link ? [`${b.link.label}: ${b.link.url}`] : [])].join("\n"),
        );
        break;
      case "button":
        parts.push(`${b.label}:\n${b.url}`);
        break;
    }
  }
  return `${parts.join("\n\n")}\n`;
}

const COLORS = { text: "#1F1F1F", muted: "#6B6B6B", primary: "#4F7A65", border: "#E5E1DA", tint: "#FFF7EC", bg: "#FAF8F5" };

function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lines(text: string) {
  return esc(text).replace(/\n/g, "<br>");
}

function renderHtml(subject: string, heading: string, blocks: Block[]) {
  const p = `margin:0 0 16px;font-size:16px;line-height:1.5;color:${COLORS.text}`;
  const body = blocks
    .map((b) => {
      switch (b.kind) {
        case "p":
          return `<p style="${p}">${lines(b.text)}</p>`;
        case "note":
          return `<p style="${p};padding:12px 16px;background:${COLORS.tint};border-radius:8px">${lines(b.text)}</p>`;
        case "quote":
          return `<div style="margin:0 0 16px;padding:12px 16px;border:1px solid ${COLORS.border};border-radius:8px"><p style="margin:0 0 4px;font-weight:600;color:${COLORS.text}">${esc(b.label)}</p><p style="margin:0;font-size:16px;line-height:1.5;color:${COLORS.text}">&ldquo;${lines(b.text)}&rdquo;</p></div>`;
        case "details":
          return `<table role="presentation" style="width:100%;margin:0 0 16px;border:1px solid ${COLORS.border};border-radius:8px;border-collapse:separate;padding:8px 12px">${b.rows
            .map(
              ([k, v]) =>
                `<tr><td style="padding:4px 12px 4px 0;color:${COLORS.muted};vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:4px 0;color:${COLORS.text}">${esc(v)}</td></tr>`,
            )
            .join("")}${
            b.link
              ? `<tr><td></td><td style="padding:4px 0"><a href="${esc(b.link.url)}" style="color:${COLORS.primary}">${esc(b.link.label)}</a></td></tr>`
              : ""
          }</table>`;
        case "button":
          return `<p style="margin:0 0 8px"><a href="${esc(b.url)}" style="display:inline-block;padding:12px 20px;background:${COLORS.primary};color:#FFFFFF;border-radius:8px;font-weight:600;text-decoration:none">${esc(b.label)}</a></p><p style="margin:0 0 16px;font-size:13px;color:${COLORS.muted};word-break:break-all">${esc(b.url)}</p>`;
      }
    })
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px;background:#FFFFFF;border:1px solid ${COLORS.border};border-radius:12px">
<p style="margin:0 0 16px;font-size:14px;color:${COLORS.muted}">Conscious Connections</p>
<h1 style="margin:0 0 16px;font-size:22px;color:${COLORS.text}">${esc(heading)}</h1>
${body}
</div></body></html>`;
}
