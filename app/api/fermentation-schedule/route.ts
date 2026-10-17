import { NextRequest, NextResponse } from "next/server";
import { premiumGateResponse } from "@/lib/auth/plan";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getScheduleOwner(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  userId: string,
  batchId: string
) {
  const { data: batch, error } = await serviceRole
    .from("batches")
    .select("id, user_id, aktivt_kar")
    .eq("id", batchId)
    .maybeSingle();
  if (error) {
    console.error("Could not verify fermentation schedule batch", error);
    return { response: NextResponse.json({ error: "Could not verify batch access" }, { status: 500 }) };
  }
  if (!batch) {
    return { response: NextResponse.json({ error: "Batch not found" }, { status: 404 }) };
  }
  if (batch.user_id !== userId) {
    if (!batch.aktivt_kar) {
      return { response: NextResponse.json({ error: "Batch not found" }, { status: 404 }) };
    }
    const { data: share, error: shareError } = await serviceRole
      .from("kar_contributors")
      .select("kar_id")
      .eq("kar_id", batch.aktivt_kar)
      .eq("user_id", userId)
      .maybeSingle();
    if (shareError) {
      console.error("Could not verify fermentation schedule contributor", shareError);
      return { response: NextResponse.json({ error: "Could not verify batch access" }, { status: 500 }) };
    }
    if (!share) {
      return { response: NextResponse.json({ error: "Batch not found" }, { status: 404 }) };
    }
  }

  const premiumDenied = await premiumGateResponse(serviceRole, batch.user_id);
  if (premiumDenied) return { response: premiumDenied };
  return { batch, ownerId: batch.user_id };
}

async function getAuthenticatedUser(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  return { user, serviceRole };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  const batchId = request.nextUrl.searchParams.get("batchId") ?? "";
  if (!UUID_PATTERN.test(batchId)) {
    return NextResponse.json({ error: "A valid batch ID is required" }, { status: 400 });
  }
  const access = await getScheduleOwner(auth.serviceRole, auth.user.id, batchId);
  if ("response" in access) return access.response;

  const { data, error } = await auth.serviceRole
    .from("fermentation_schedule_steps")
    .select("id, title, notes, scheduled_at, completed_at, position, reminder_id, created_at")
    .eq("batch_id", batchId)
    .eq("user_id", access.ownerId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Could not load fermentation schedule", error);
    return NextResponse.json({ error: "Could not load fermentation schedule" }, { status: 500 });
  }
  return NextResponse.json({ steps: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const batchId = typeof body.batchId === "string" ? body.batchId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const scheduledAt =
    typeof body.scheduledAt === "string" && body.scheduledAt
      ? new Date(body.scheduledAt)
      : null;
  if (
    !UUID_PATTERN.test(batchId) ||
    !title ||
    title.length > 120 ||
    notes.length > 2000 ||
    (body.scheduledAt && (!scheduledAt || !Number.isFinite(scheduledAt.getTime())))
  ) {
    return NextResponse.json({ error: "Enter a valid schedule step" }, { status: 400 });
  }

  const access = await getScheduleOwner(auth.serviceRole, auth.user.id, batchId);
  if ("response" in access) return access.response;
  const { count, error: countError } = await auth.serviceRole
    .from("fermentation_schedule_steps")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .eq("user_id", access.ownerId);
  if (countError) {
    console.error("Could not check fermentation schedule size", countError);
    return NextResponse.json({ error: "Could not add schedule step" }, { status: 500 });
  }
  if ((count ?? 0) >= 50) {
    return NextResponse.json({ error: "A schedule can contain at most 50 steps" }, { status: 409 });
  }

  const { data: step, error: insertError } = await auth.serviceRole
    .from("fermentation_schedule_steps")
    .insert({
      batch_id: batchId,
      user_id: access.ownerId,
      title,
      notes: notes || null,
      scheduled_at: scheduledAt?.toISOString() ?? null,
      position: count ?? 0,
    })
    .select("id, title, notes, scheduled_at, completed_at, position, reminder_id, created_at")
    .single();
  if (insertError) {
    console.error("Could not add fermentation schedule step", insertError);
    return NextResponse.json({ error: "Could not add schedule step" }, { status: 500 });
  }

  if (scheduledAt && scheduledAt.getTime() > Date.now()) {
    const { data: reminder, error: reminderError } = await auth.serviceRole
      .from("batch_reminders")
      .insert({
        user_id: access.ownerId,
        batch_id: batchId,
        type: "manual",
        message: `Fermentation: ${title}`,
        remind_at: scheduledAt.toISOString(),
      })
      .select("id")
      .single();
    if (reminderError) {
      const { error: cleanupError } = await auth.serviceRole
        .from("fermentation_schedule_steps")
        .delete()
        .eq("id", step.id)
        .eq("user_id", access.ownerId);
      if (cleanupError) {
        console.error("Could not roll back failed fermentation reminder creation", cleanupError);
      }
      console.error("Could not create fermentation stage reminder", reminderError);
      return NextResponse.json({ error: "Could not create the schedule reminder" }, { status: 500 });
    }
    const { error: linkError } = await auth.serviceRole
      .from("fermentation_schedule_steps")
      .update({ reminder_id: reminder.id })
      .eq("id", step.id)
      .eq("user_id", access.ownerId);
    if (linkError) {
      console.error("Could not link fermentation reminder to schedule step", linkError);
      return NextResponse.json({ error: "Schedule was added, but its reminder could not be linked" }, { status: 500 });
    }
    step.reminder_id = reminder.id;
  }

  return NextResponse.json({ step }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const batchId = typeof body.batchId === "string" ? body.batchId : "";
  if (
    !UUID_PATTERN.test(batchId) ||
    typeof body.id !== "string" ||
    !UUID_PATTERN.test(body.id) ||
    typeof body.completed !== "boolean"
  ) {
    return NextResponse.json({ error: "A valid schedule step and completion state are required" }, { status: 400 });
  }
  const access = await getScheduleOwner(auth.serviceRole, auth.user.id, batchId);
  if ("response" in access) return access.response;

  const completedAt = body.completed ? new Date().toISOString() : null;
  const { data: step, error } = await auth.serviceRole
    .from("fermentation_schedule_steps")
    .update({ completed_at: completedAt })
    .eq("id", body.id)
    .eq("batch_id", batchId)
    .eq("user_id", access.ownerId)
    .select("id, reminder_id")
    .maybeSingle();
  if (error) {
    console.error("Could not update fermentation schedule step", error);
    return NextResponse.json({ error: "Could not update schedule step" }, { status: 500 });
  }
  if (!step) return NextResponse.json({ error: "Schedule step not found" }, { status: 404 });
  if (step.reminder_id) {
    const { error: reminderError } = await auth.serviceRole
      .from("batch_reminders")
      .update({ read_at: completedAt })
      .eq("id", step.reminder_id)
      .eq("user_id", access.ownerId);
    if (reminderError) {
      console.error("Could not update fermentation stage reminder", reminderError);
      return NextResponse.json({ error: "Schedule updated, but reminder status could not be updated" }, { status: 500 });
    }
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  const batchId = request.nextUrl.searchParams.get("batchId") ?? "";
  const stepId = request.nextUrl.searchParams.get("stepId") ?? "";
  if (!UUID_PATTERN.test(batchId) || !UUID_PATTERN.test(stepId)) {
    return NextResponse.json({ error: "Valid batch and schedule step IDs are required" }, { status: 400 });
  }
  const access = await getScheduleOwner(auth.serviceRole, auth.user.id, batchId);
  if ("response" in access) return access.response;

  const { data: step, error: lookupError } = await auth.serviceRole
    .from("fermentation_schedule_steps")
    .select("id, reminder_id")
    .eq("id", stepId)
    .eq("batch_id", batchId)
    .eq("user_id", access.ownerId)
    .maybeSingle();
  if (lookupError) {
    console.error("Could not load fermentation step before deletion", lookupError);
    return NextResponse.json({ error: "Could not delete schedule step" }, { status: 500 });
  }
  if (!step) return NextResponse.json({ error: "Schedule step not found" }, { status: 404 });

  const { error: deleteError } = await auth.serviceRole
    .from("fermentation_schedule_steps")
    .delete()
    .eq("id", stepId)
    .eq("user_id", access.ownerId);
  if (deleteError) {
    console.error("Could not delete fermentation schedule step", deleteError);
    return NextResponse.json({ error: "Could not delete schedule step" }, { status: 500 });
  }
  if (step.reminder_id) {
    const { error: reminderError } = await auth.serviceRole
      .from("batch_reminders")
      .delete()
      .eq("id", step.reminder_id)
      .eq("user_id", access.ownerId);
    if (reminderError) {
      console.error("Could not delete fermentation stage reminder", reminderError);
      return NextResponse.json({ error: "Schedule step was removed, but its reminder could not be removed" }, { status: 500 });
    }
  }
  return NextResponse.json({ success: true });
}
