import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function migrationRequired(error: { code?: string | null }) {
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "");
}

async function getOwnedFinishedBatch(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  batchId: string,
  userId: string
) {
  return serviceRole
    .from("batches")
    .select("id, name, status, packaged_at, finished_date")
    .eq("id", batchId)
    .eq("user_id", userId)
    .maybeSingle();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
  }
  const { supabase, serviceRole } = supabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: batch, error: batchError } = await getOwnedFinishedBatch(
    serviceRole,
    params.id,
    user.id
  );
  if (batchError) {
    console.error("Could not load batch for aging", batchError);
    return NextResponse.json({ error: "Could not load bottle aging" }, { status: 500 });
  }
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (!batch.finished_date || !["finished", "avsluttet", "ferdig"].includes(
    String(batch.status ?? "").toLowerCase()
  )) {
    return NextResponse.json({ error: "Bottle aging is available after finishing the batch." }, { status: 409 });
  }

  const { data: aging, error: agingError } = await serviceRole
    .from("batch_aging")
    .select("id, started_at, target_tasting_date, reminder_id, completed_at")
    .eq("batch_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (agingError) {
    console.error("Could not load bottle aging", agingError);
    return NextResponse.json(
      { error: migrationRequired(agingError)
        ? "Apply the bottle aging database migration to use this feature."
        : "Could not load bottle aging." },
      { status: migrationRequired(agingError) ? 503 : 500 }
    );
  }
  if (!aging) return NextResponse.json({ aging: null, tastings: [] });

  const { data: tastings, error: tastingsError } = await serviceRole
    .from("batch_aging_tastings")
    .select("id, tasted_at, notes, created_at")
    .eq("batch_aging_id", aging.id)
    .eq("user_id", user.id)
    .order("tasted_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (tastingsError) {
    console.error("Could not load bottle aging tasting notes", tastingsError);
    return NextResponse.json({ error: "Could not load tasting notes." }, { status: 500 });
  }

  let reminder = null;
  if (aging.reminder_id) {
    const { data, error: reminderError } = await serviceRole
      .from("batch_reminders")
      .select("remind_at")
      .eq("id", aging.reminder_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (reminderError) {
      console.error("Could not load bottle aging reminder", reminderError);
      return NextResponse.json({ error: "Could not load bottle aging reminder." }, { status: 500 });
    }
    reminder = data;
  }
  return NextResponse.json({ aging, tastings: tastings ?? [], reminder });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
  }
  const { supabase, serviceRole } = supabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: batch, error: batchError } = await getOwnedFinishedBatch(
    serviceRole,
    params.id,
    user.id
  );
  if (batchError) {
    console.error("Could not verify batch for aging", batchError);
    return NextResponse.json({ error: "Could not verify batch ownership." }, { status: 500 });
  }
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (!batch.finished_date || !["finished", "avsluttet", "ferdig"].includes(
    String(batch.status ?? "").toLowerCase()
  )) {
    return NextResponse.json({ error: "Bottle aging is available after finishing the batch." }, { status: 409 });
  }

  const record = body as Record<string, unknown>;
  if (
    record.action !== undefined &&
    record.action !== "start" &&
    record.action !== "tasting"
  ) {
    return NextResponse.json({ error: "Unsupported bottle aging action." }, { status: 400 });
  }
  if (record.action === "tasting") {
    const tastedAt = typeof record.tastedAt === "string" ? record.tastedAt : "";
    const notes = typeof record.notes === "string" ? record.notes.trim() : "";
    if (
      !isCalendarDate(tastedAt) ||
      !notes ||
      notes.length > 2000
    ) {
      return NextResponse.json(
        { error: "Enter a valid tasting date and notes up to 2000 characters." },
        { status: 400 }
      );
    }

    const { data: aging, error: agingError } = await serviceRole
      .from("batch_aging")
      .select("id, completed_at")
      .eq("batch_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (agingError) {
      console.error("Could not verify bottle aging record", agingError);
      return NextResponse.json({ error: "Could not verify bottle aging." }, { status: 500 });
    }
    if (!aging) return NextResponse.json({ error: "Start bottle aging before adding a tasting." }, { status: 409 });
    if (aging.completed_at) {
      return NextResponse.json({ error: "This bottle aging record is complete." }, { status: 409 });
    }

    const { data: tasting, error: insertError } = await serviceRole
      .from("batch_aging_tastings")
      .insert({
        batch_aging_id: aging.id,
        batch_id: params.id,
        user_id: user.id,
        tasted_at: tastedAt,
        notes,
      })
      .select("id, tasted_at, notes, created_at")
      .single();
    if (insertError) {
      console.error("Could not save bottle aging tasting", insertError);
      return NextResponse.json({ error: "Could not save tasting notes." }, { status: 500 });
    }
    return NextResponse.json({ tasting }, { status: 201 });
  }

  if (
    (record.targetTastingDate !== undefined &&
      typeof record.targetTastingDate !== "string") ||
    (record.remindAt !== undefined && typeof record.remindAt !== "string")
  ) {
    return NextResponse.json({ error: "Enter a valid tasting date and reminder time." }, { status: 400 });
  }
  const targetDate = record.targetTastingDate ? String(record.targetTastingDate) : null;
  const remindAt =
    typeof record.remindAt === "string" && record.remindAt
      ? new Date(record.remindAt)
      : null;
  if (
    (targetDate && !isCalendarDate(targetDate)) ||
    (record.remindAt && (!remindAt || !Number.isFinite(remindAt.getTime()) || remindAt.getTime() <= Date.now()))
  ) {
    return NextResponse.json({ error: "Enter a valid tasting date and future reminder time." }, { status: 400 });
  }

  const { data: existingAging, error: existingError } = await serviceRole
    .from("batch_aging")
    .select("id")
    .eq("batch_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingError) {
    console.error("Could not check bottle aging record", existingError);
    return NextResponse.json({ error: "Could not start bottle aging." }, { status: 500 });
  }
  if (existingAging) {
    return NextResponse.json({ error: "Bottle aging has already been started for this batch." }, { status: 409 });
  }

  if (remindAt) {
    const { data, error: profileError } = await serviceRole
      .from("profiles")
      .select("batch_reminders_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Could not load reminder preferences", profileError);
      return NextResponse.json({ error: "Could not verify reminder settings." }, { status: 500 });
    }
    if (data?.batch_reminders_enabled === false) {
      return NextResponse.json({ error: "Enable batch reminders in settings to schedule a tasting reminder." }, { status: 403 });
    }
  }

  const { data: aging, error: insertError } = await serviceRole
    .from("batch_aging")
    .insert({
      batch_id: params.id,
      user_id: user.id,
      started_at: batch.packaged_at || batch.finished_date,
      target_tasting_date: targetDate,
    })
    .select("id, started_at, target_tasting_date, reminder_id, completed_at")
    .single();
  if (insertError) {
    console.error("Could not start bottle aging", insertError);
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Bottle aging has already been started for this batch." }, { status: 409 });
    }
    return NextResponse.json(
      { error: migrationRequired(insertError)
        ? "Apply the bottle aging database migration to use this feature."
        : "Could not start bottle aging." },
      { status: migrationRequired(insertError) ? 503 : 500 }
    );
  }

  if (remindAt) {
    const { data: reminder, error: reminderError } = await serviceRole
      .from("batch_reminders")
      .insert({
        user_id: user.id,
        batch_id: params.id,
        type: "manual",
        message: `Bottle aging: taste ${batch.name || "your batch"}`,
        remind_at: remindAt.toISOString(),
      })
      .select("id")
      .single();
    if (reminderError) {
      console.error("Could not schedule bottle aging reminder", reminderError);
      const { error: cleanupError } = await serviceRole
        .from("batch_aging")
        .delete()
        .eq("id", aging.id)
        .eq("user_id", user.id);
      if (cleanupError) {
        console.error("Could not clean up bottle aging after reminder failure", cleanupError);
        return NextResponse.json({ error: "The reminder could not be scheduled and the incomplete aging record could not be removed. Contact support." }, { status: 500 });
      }
      return NextResponse.json({ error: "Bottle aging was not started because the reminder could not be scheduled." }, { status: 500 });
    }

    const { data: updatedAging, error: linkError } = await serviceRole
      .from("batch_aging")
      .update({ reminder_id: reminder.id })
      .eq("id", aging.id)
      .eq("user_id", user.id)
      .select("id, started_at, target_tasting_date, reminder_id, completed_at")
      .single();
    if (linkError) {
      console.error("Could not link bottle aging reminder", linkError);
      const [{ error: reminderCleanupError }, { error: agingCleanupError }] = await Promise.all([
        serviceRole.from("batch_reminders").delete().eq("id", reminder.id).eq("user_id", user.id),
        serviceRole.from("batch_aging").delete().eq("id", aging.id).eq("user_id", user.id),
      ]);
      if (reminderCleanupError || agingCleanupError) {
        console.error("Could not clean up incomplete bottle aging setup", {
          reminderCleanupError,
          agingCleanupError,
        });
        return NextResponse.json({ error: "The reminder could not be linked and incomplete bottle-aging data could not be fully removed. Contact support." }, { status: 500 });
      }
      return NextResponse.json({ error: "Bottle aging was not started because the reminder could not be linked." }, { status: 500 });
    }
    return NextResponse.json({ aging: updatedAging }, { status: 201 });
  }

  return NextResponse.json({ aging }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
  }
  const { supabase, serviceRole } = supabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("action" in body) || body.action !== "complete") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: aging, error: agingError } = await serviceRole
    .from("batch_aging")
    .select("id, reminder_id, completed_at")
    .eq("batch_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (agingError) {
    console.error("Could not load bottle aging record to complete", agingError);
    return NextResponse.json({ error: "Could not complete bottle aging." }, { status: 500 });
  }
  if (!aging) return NextResponse.json({ error: "Bottle aging record not found." }, { status: 404 });
  if (aging.completed_at) return NextResponse.json({ success: true });

  const completedAt = new Date().toISOString();
  const { error: completeError } = await serviceRole
    .from("batch_aging")
    .update({ completed_at: completedAt })
    .eq("id", aging.id)
    .eq("user_id", user.id)
    .is("completed_at", null);
  if (completeError) {
    console.error("Could not complete bottle aging", completeError);
    return NextResponse.json({ error: "Could not complete bottle aging." }, { status: 500 });
  }
  if (aging.reminder_id) {
    const { error: reminderError } = await serviceRole
      .from("batch_reminders")
      .update({ read_at: completedAt })
      .eq("id", aging.reminder_id)
      .eq("user_id", user.id)
      .is("read_at", null);
    if (reminderError) {
      console.error("Could not dismiss bottle aging reminder", reminderError);
      const { error: rollbackError } = await serviceRole
        .from("batch_aging")
        .update({ completed_at: null })
        .eq("id", aging.id)
        .eq("user_id", user.id)
        .eq("completed_at", completedAt);
      if (rollbackError) {
        console.error("Could not roll back bottle aging completion", rollbackError);
        return NextResponse.json({ error: "The reminder could not be cleared and bottle aging could not be restored to its open state. Contact support." }, { status: 500 });
      }
      return NextResponse.json({ error: "Could not complete bottle aging because its reminder could not be cleared." }, { status: 500 });
    }
  }
  return NextResponse.json({ success: true });
}
