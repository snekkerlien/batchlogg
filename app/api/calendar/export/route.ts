import { NextResponse } from "next/server";
import { premiumGateResponse } from "@/lib/auth/plan";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeICalText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatICalDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function formatAllDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[1]}${match[2]}${match[3]}` : null;
}

function eventLines(uid: string, summary: string, start: string, allDay: boolean, url: string) {
  const dtStart = allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`;
  const endDate = allDay
    ? new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(4, 6)) - 1, Number(start.slice(6, 8)) + 1))
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "")
    : null;
  const dtEnd = allDay ? `DTEND;VALUE=DATE:${endDate}` : null;
  return [
    "BEGIN:VEVENT",
    `UID:${uid}@batchlogg`,
    `DTSTAMP:${formatICalDate(new Date().toISOString())}`,
    dtStart,
    ...(dtEnd ? [dtEnd] : []),
    `SUMMARY:${escapeICalText(summary)}`,
    `URL:${url}`,
    "END:VEVENT",
  ];
}

async function loadAllBatches(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  userId: string
) {
  const rows: {
    id: string;
    name: string | null;
    startdato: string | null;
    finished_date: string | null;
    aktivt_kar: string | null;
  }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await serviceRole
      .from("batches")
      .select("id, name, startdato, finished_date, aktivt_kar")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) return { rows: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return { rows, error: null };
  }
}

async function loadUpcomingReminders(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  userId: string,
  from: string
) {
  const rows: {
    id: string;
    batch_id: string;
    message: string;
    remind_at: string;
  }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await serviceRole
      .from("batch_reminders")
      .select("id, batch_id, message, remind_at")
      .eq("user_id", userId)
      .gte("remind_at", from)
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) return { rows: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return { rows, error: null };
  }
}

export async function GET() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const denied = await premiumGateResponse(serviceRole, user.id);
  if (denied) return denied;

  const [{ rows: batches, error: batchesError }, { rows: reminders, error: remindersError }] =
    await Promise.all([
      loadAllBatches(serviceRole, user.id),
      loadUpcomingReminders(serviceRole, user.id, new Date().toISOString()),
  ]);
  if (batchesError || remindersError) {
    console.error("Could not load calendar export data", batchesError || remindersError);
    return NextResponse.json({ error: "Could not export calendar" }, { status: 500 });
  }

  const batchNames = new Map((batches ?? []).map((batch) => [batch.id, batch.name || "Batch"]));
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://batchlogg.vercel.app").replace(/\/+$/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Batchlogg//Brew Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const batch of batches ?? []) {
    const url = batch.aktivt_kar
      ? `${appUrl}/kar/${encodeURIComponent(batch.aktivt_kar)}`
      : `${appUrl}/batch-history`;
    const start = batch.startdato ? formatAllDay(batch.startdato) : null;
    if (start) lines.push(...eventLines(`batch-${batch.id}-start`, `${batch.name || "Batch"} started`, start, true, url));
    const finish = batch.finished_date ? formatAllDay(batch.finished_date) : null;
    if (finish) lines.push(...eventLines(`batch-${batch.id}-finish`, `${batch.name || "Batch"} finished`, finish, true, url));
  }
  for (const reminder of reminders ?? []) {
    const start = formatICalDate(reminder.remind_at);
    if (!start) continue;
    const batchName = batchNames.get(reminder.batch_id) ?? "Batch";
    lines.push(
      ...eventLines(
        `reminder-${reminder.id}`,
        `${batchName}: ${reminder.message}`,
        start,
        false,
        `${appUrl}/calendar`
      )
    );
  }
  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="batchlogg-calendar.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
