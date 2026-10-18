import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { attendeesCsv, attendeesFilename } from "@/lib/events/attendees";
import { createClient } from "@/lib/supabase/server";

// GET /admin/events/[id]/attendees: the attendee list as a CSV file (names,
// emails and dates). ?date=<occurrence start, ISO> limits it to one date of a
// recurring event. Admins only; each download is noted in the activity log.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return new NextResponse("Not allowed", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const date = request.nextUrl.searchParams.get("date");
  const occurrence = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : null;

  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("title, start_at, end_at").eq("id", id).maybeSingle();
  if (!event) return new NextResponse("Not found", { status: 404 });

  let query = supabase
    .from("registrations")
    .select("name, email, occurrence_start, created_at")
    .eq("event_id", id)
    .order("occurrence_start")
    .order("created_at");
  if (occurrence) query = query.eq("occurrence_start", occurrence);
  const { data: attendees, error } = await query;
  if (error) {
    console.error("Attendee export failed", error);
    return new NextResponse("The list couldn't be made. Please try again.", { status: 500 });
  }

  await supabase.from("event_activity").insert({
    event_id: id,
    actor: "admin",
    action: "Downloaded the attendee list",
    note: `${attendees.length} ${attendees.length === 1 ? "person" : "people"}${occurrence ? ` for ${occurrence.slice(0, 10)}` : ""}`,
  });

  const filename = attendeesFilename(event.title, occurrence ? new Date(occurrence).toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" }) : undefined);
  return new NextResponse(attendeesCsv(attendees, event), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
