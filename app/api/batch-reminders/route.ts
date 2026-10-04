import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SG_REMINDER_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("batch_reminders_enabled")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not load reminder preferences", profileError);
    return NextResponse.json({ error: "Could not load reminder preferences" }, { status: 500 });
  }
  if (profile?.batch_reminders_enabled === false) {
    return NextResponse.json({ unreadCount: 0, reminders: [] });
  }

  const requestedBatchId = request.nextUrl.searchParams.get("batch_id");
  if (requestedBatchId && !UUID_PATTERN.test(requestedBatchId)) {
    return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
  }

  const { data: activeBatches, error: batchesError } = await serviceRole
    .from("batches")
    .select("id, name, startdato, created_at")
    .eq("user_id", user.id)
    .in("status", ["Aktiv", "Sekundær", "secondary"]);

  if (batchesError) {
    console.error("Could not load active batches for SG reminders", batchesError);
    return NextResponse.json({ error: "Could not load batch reminders" }, { status: 500 });
  }

  const activeBatchIds = (activeBatches ?? []).map((batch) => batch.id);
  if (activeBatchIds.length > 0) {
    const { data: readings, error: readingsError } = await serviceRole
      .from("sg_readings")
      .select("id, batch_id, created_at")
      .in("batch_id", activeBatchIds)
      .order("created_at", { ascending: false });

    if (readingsError) {
      console.error("Could not load recent SG readings", readingsError);
      return NextResponse.json({ error: "Could not load SG reminders" }, { status: 500 });
    }

    const latestReadingByBatch = new Map<string, (typeof readings)[number]>();
    for (const reading of readings ?? []) {
      if (reading.batch_id && !latestReadingByBatch.has(reading.batch_id)) {
        latestReadingByBatch.set(reading.batch_id, reading);
      }
    }

    const now = Date.now();
    const staleReadingReminders = (activeBatches ?? []).flatMap((batch) => {
      const latestReading = latestReadingByBatch.get(batch.id);
      const anchorDate = latestReading?.created_at || batch.startdato || batch.created_at;
      const anchorTime = new Date(anchorDate).getTime();
      if (!Number.isFinite(anchorTime) || now - anchorTime < SG_REMINDER_AFTER_DAYS * DAY_MS) {
        return [];
      }

      return [{
        user_id: user.id,
        batch_id: batch.id,
        source_reading_id: latestReading?.id ?? null,
        stale_key: latestReading ? `reading:${latestReading.id}` : "initial",
        type: "sg_check",
        message: `No SG reading has been logged for "${batch.name || "this batch"}" in 7 days. Consider checking its progress.`,
        remind_at: new Date(anchorTime + SG_REMINDER_AFTER_DAYS * DAY_MS).toISOString(),
      }];
    });

    const remindersWithReading = staleReadingReminders.filter(
      (reminder) => reminder.source_reading_id !== null
    );
    const remindersWithoutReading = staleReadingReminders.filter(
      (reminder) => reminder.source_reading_id === null
    );

    const readingReminderInsert = remindersWithReading.length
      ? await serviceRole
          .from("batch_reminders")
          .upsert(remindersWithReading, {
            onConflict: "batch_id,source_reading_id",
            ignoreDuplicates: true,
          })
      : { error: null };

    const noReadingReminderInsert = remindersWithoutReading.length
      ? await serviceRole
          .from("batch_reminders")
          .upsert(remindersWithoutReading, {
            onConflict: "batch_id,stale_key",
            ignoreDuplicates: true,
          })
      : { error: null };

    if (readingReminderInsert.error || noReadingReminderInsert.error) {
      console.error(
        "Could not create SG check reminders",
        readingReminderInsert.error || noReadingReminderInsert.error
      );
      return NextResponse.json({ error: "Could not create SG reminders" }, { status: 500 });
    }
  }

  let remindersQuery = supabase
    .from("batch_reminders")
    .select("id, batch_id, type, message, remind_at, created_at, read_at")
    .eq("user_id", user.id)
    .order("remind_at", { ascending: requestedBatchId !== null })
    .limit(requestedBatchId ? 50 : 20);

  if (requestedBatchId) {
    remindersQuery = remindersQuery
      .eq("batch_id", requestedBatchId)
      .eq("type", "manual");
  } else {
    remindersQuery = remindersQuery
      .lte("remind_at", new Date().toISOString())
      .or("type.eq.manual,read_at.is.null");
  }

  const { data: reminders, error: remindersError } = await remindersQuery;
  if (remindersError) {
    console.error("Could not load batch reminders", remindersError);
    return NextResponse.json({ error: "Could not load batch reminders" }, { status: 500 });
  }

  const rows = reminders ?? [];
  const reminderBatchIds = [...new Set(rows.map((reminder) => reminder.batch_id))];
  const { data: batches, error: reminderBatchesError } = reminderBatchIds.length
    ? await serviceRole
        .from("batches")
        .select("id, name, aktivt_kar")
        .in("id", reminderBatchIds)
        .eq("user_id", user.id)
    : { data: [], error: null };

  if (reminderBatchesError) {
    console.error("Could not load reminder batch details", reminderBatchesError);
    return NextResponse.json({ error: "Could not load batch reminders" }, { status: 500 });
  }

  const batchDetailsById = new Map((batches ?? []).map((batch) => [batch.id, batch]));
  const { count: unreadCount, error: unreadError } = requestedBatchId
    ? { count: null, error: null }
    : await supabase
        .from("batch_reminders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null)
        .lte("remind_at", new Date().toISOString());

  if (unreadError) {
    console.error("Could not count unread batch reminders", unreadError);
    return NextResponse.json({ error: "Could not count unread reminders" }, { status: 500 });
  }

  return NextResponse.json({
    unreadCount,
    reminders: rows.flatMap((reminder) => {
      const batch = batchDetailsById.get(reminder.batch_id);
      if (!batch) return [];
      return [{
        ...reminder,
        batch_name: batch.name || "Batch",
        kar_id: batch.aktivt_kar,
      }];
    }),
  });
}

export async function POST(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("batch_reminders_enabled")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not load reminder preferences", profileError);
    return NextResponse.json({ error: "Could not load reminder preferences" }, { status: 500 });
  }
  if (profile?.batch_reminders_enabled === false) {
    return NextResponse.json({ error: "Brew reminders are disabled in your settings" }, { status: 403 });
  }

  let body: { batchId?: unknown; remindAt?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const remindAt = typeof body.remindAt === "string" ? new Date(body.remindAt) : null;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (
    typeof body.batchId !== "string" ||
    !UUID_PATTERN.test(body.batchId) ||
    !remindAt ||
    !Number.isFinite(remindAt.getTime()) ||
    remindAt.getTime() <= Date.now() ||
    message.length < 1 ||
    message.length > 300
  ) {
    return NextResponse.json(
      { error: "Enter a valid batch, future reminder time, and message up to 300 characters" },
      { status: 400 }
    );
  }

  const { data: batch, error: batchError } = await serviceRole
    .from("batches")
    .select("id")
    .eq("id", body.batchId)
    .eq("user_id", user.id)
    .in("status", ["Aktiv", "Sekundær", "secondary"])
    .maybeSingle();

  if (batchError) {
    console.error("Could not verify reminder batch ownership", batchError);
    return NextResponse.json({ error: "Could not verify batch ownership" }, { status: 500 });
  }
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const { data: reminder, error: insertError } = await supabase
    .from("batch_reminders")
    .insert({
      user_id: user.id,
      batch_id: batch.id,
      type: "manual",
      message,
      remind_at: remindAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Could not create batch reminder", insertError);
    return NextResponse.json({ error: "Could not create batch reminder" }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: reminder.id });
}

export async function PATCH(request: NextRequest) {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { ids?: unknown; all?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const markAll = body.all === true;
  if (
    !markAll &&
    (!Array.isArray(body.ids) ||
      body.ids.length === 0 ||
      body.ids.length > 20 ||
      body.ids.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id)))
  ) {
    return NextResponse.json({ error: "A list of reminder IDs is required" }, { status: 400 });
  }

  let updateQuery = supabase
    .from("batch_reminders")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null)
    .lte("remind_at", new Date().toISOString());

  if (!markAll) {
    updateQuery = updateQuery.in("id", body.ids as string[]);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    console.error("Could not mark batch reminders read", updateError);
    return NextResponse.json({ error: "Could not update reminders" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (request.nextUrl.searchParams.get("all") === "true") {
    const now = new Date().toISOString();
    const [manualDelete, sgDismiss] = await Promise.all([
      serviceRole
        .from("batch_reminders")
        .delete()
        .eq("user_id", user.id)
        .eq("type", "manual")
        .lte("remind_at", now),
      serviceRole
        .from("batch_reminders")
        .update({ read_at: now })
        .eq("user_id", user.id)
        .eq("type", "sg_check")
        .is("read_at", null)
        .lte("remind_at", now),
    ]);

    const clearError = manualDelete.error || sgDismiss.error;
    if (clearError) {
      console.error("Could not clear batch notifications", clearError);
      return NextResponse.json(
        { error: "Could not clear batch notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id || !UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Valid reminder ID is required" }, { status: 400 });
  }

  const { data, error: deleteError } = await supabase
    .from("batch_reminders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("type", "manual")
    .select("id");

  if (deleteError) {
    console.error("Could not delete batch reminder", deleteError);
    return NextResponse.json({ error: "Could not delete reminder" }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
