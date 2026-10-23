import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { premiumGateResponse } from "@/lib/auth/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string | null): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const accessDenied = await premiumGateResponse(serviceRole, user.id);
  if (accessDenied) return accessDenied;

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!isValidDate(from) || !isValidDate(to) || from >= to) {
    return NextResponse.json({ error: "A valid calendar date range is required" }, { status: 400 });
  }

  const fromTime = new Date(`${from}T00:00:00`);
  const toTime = new Date(`${to}T00:00:00`);
  if (toTime.getTime() - fromTime.getTime() > 63 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Calendar range cannot exceed 63 days" }, { status: 400 });
  }

  const [
    { data: startedBatches, error: startError },
    { data: finishedBatches, error: finishError },
    { data: activeBatches, error: activeError },
    { data: reminders, error: remindersError },
  ] = await Promise.all([
    serviceRole
      .from("batches")
      .select("id, name, startdato, finished_date, status, aktivt_kar")
      .eq("user_id", user.id)
      .gte("startdato", from)
      .lt("startdato", to)
      .limit(1000),
    serviceRole
      .from("batches")
      .select("id, name, startdato, finished_date, status, aktivt_kar")
      .eq("user_id", user.id)
      .gte("finished_date", from)
      .lt("finished_date", to)
      .limit(1000),
    serviceRole
      .from("batches")
      .select("id, name, startdato, finished_date, status, aktivt_kar")
      .eq("user_id", user.id)
      .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"])
      .lt("startdato", to)
      .limit(1000),
    serviceRole
      .from("batch_reminders")
      .select("id, batch_id, type, message, remind_at, read_at")
      .eq("user_id", user.id)
      .gte("remind_at", new Date(`${from}T00:00:00`).toISOString())
      .lt("remind_at", new Date(`${to}T00:00:00`).toISOString())
      .order("remind_at", { ascending: true })
      .limit(1000),
  ]);

  const queryError = startError || finishError || activeError || remindersError;
  if (queryError) {
    console.error("Could not load calendar data", queryError);
    return NextResponse.json({ error: "Could not load calendar data" }, { status: 500 });
  }

  const batchesById = new Map(
    [...(startedBatches ?? []), ...(finishedBatches ?? []), ...(activeBatches ?? [])]
      .map((batch) => [batch.id, batch] as const)
  );
  const reminderBatchIds = [...new Set((reminders ?? []).map((reminder) => reminder.batch_id))];
  const { data: reminderBatches, error: reminderBatchError } = reminderBatchIds.length
    ? await serviceRole
        .from("batches")
        .select("id, name, aktivt_kar")
        .in("id", reminderBatchIds)
        .eq("user_id", user.id)
    : { data: [], error: null };

  if (reminderBatchError) {
    console.error("Could not load calendar reminder batches", reminderBatchError);
    return NextResponse.json({ error: "Could not load calendar reminders" }, { status: 500 });
  }

  const reminderBatchById = new Map((reminderBatches ?? []).map((batch) => [batch.id, batch]));
  return NextResponse.json({
    batches: [...batchesById.values()],
    reminders: (reminders ?? []).flatMap((reminder) => {
      const batch = reminderBatchById.get(reminder.batch_id);
      return batch ? [{ ...reminder, batch_name: batch.name || "Batch", kar_id: batch.aktivt_kar }] : [];
    }),
  });
}
