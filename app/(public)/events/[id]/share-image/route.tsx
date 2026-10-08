import { ImageResponse } from "next/og";
import { formatShortDate, formatTimeRange } from "@/lib/format";
import { getEvent } from "@/lib/public/events";

// Share preview image for events without a poster: title, county and date on
// the theme colours. Satori (used by ImageResponse) needs literal colours, so
// these mirror the tokens in app/globals.css.
const THEME = { from: "#e8d2dd", to: "#d9e4d6", primary: "#7a3b5d", text: "#2a2024" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const event = await getEvent((await params).id);
  if (!event) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundImage: `linear-gradient(135deg, ${THEME.from}, ${THEME.to})`,
          color: THEME.text,
        }}
      >
        <div style={{ fontSize: 32, color: THEME.primary, fontWeight: 700 }}>Conscious Connections</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>{event.title}</div>
          <div style={{ fontSize: 40 }}>
            {`${event.county} · ${formatShortDate(event.start_at)}, ${formatTimeRange(event.start_at, event.end_at)}`}
          </div>
        </div>
      </div>
    ),
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
