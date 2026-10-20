import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { parseChecklistState } from "@/lib/brewing/brewDayChecklist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: { id: string } };

function missingMigration(errorCode?: string) {
  return ["42703", "PGRST204"].includes(errorCode ?? "");
}

async function getAccessibleBatch(
  batchId: string,
  userId: string,
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"]
) {
  const { data: batch, error } = await serviceRole
    .from("batches")
    .select("id, user_id, aktivt_kar, brew_day_checklist")
    .eq("id", batchId)
    .maybeSingle();
  if (error) {
    console.error("Could not load batch brew-day checklist", error);
    if (missingMigration(error.code)) {
      return {
        response: NextResponse.json(
          { error: "Apply the brew-day checklist database migration to save progress." },
          { status: 503 }
        ),
      };
    }
    return {
      response: NextResponse.json(
        { error: "Could not load batch brew-day checklist" },
        { status: 500 }
      ),
    };
  }
  if (!batch) {
    return {
      response: NextResponse.json({ error: "Batch not found" }, { status: 404 }),
    };
  }
  if (batch.user_id === userId) return { batch };

  if (batch.aktivt_kar) {
    const { data: vessel, error: vesselError } = await serviceRole
      .from("kar")
      .select("user_id")
      .eq("id", batch.aktivt_kar)
      .maybeSingle();
    if (vesselError) {
      console.error("Could not verify batch vessel access", vesselError);
      return {
        response: NextResponse.json(
          { error: "Could not verify batch access" },
          { status: 500 }
        ),
      };
    }
    if (vessel?.user_id === userId) return { batch };

    const { data: contributor, error: contributorError } = await serviceRole
      .from("kar_contributors")
      .select("kar_id")
      .eq("kar_id", batch.aktivt_kar)
      .eq("user_id", userId)
      .maybeSingle();
    if (contributorError) {
      console.error("Could not verify batch contributor access", contributorError);
      return {
        response: NextResponse.json(
          { error: "Could not verify batch access" },
          { status: 500 }
        ),
      };
    }
    if (contributor) return { batch };
  }

  return {
    response: NextResponse.json({ error: "Batch access denied" }, { status: 403 }),
  };
}

async function getAuthenticatedUser() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { user, serviceRole };
}

export async function GET(_request: Request, { params }: RouteContext) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
  }
  const context = await getAuthenticatedUser();
  if ("response" in context) return context.response;

  const access = await getAccessibleBatch(
    params.id,
    context.user.id,
    context.serviceRole
  );
  if ("response" in access) return access.response;

  const saved = access.batch.brew_day_checklist;
  if (saved === null) return NextResponse.json({ checklist: null });
  try {
    return NextResponse.json({
      checklist: { version: 1, ...parseChecklistState(saved) },
    });
  } catch (error) {
    console.error("Batch has invalid saved brew-day checklist data", error);
    return NextResponse.json(
      { error: "Saved checklist data is invalid and could not be loaded." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
  }
  const context = await getAuthenticatedUser();
  if ("response" in context) return context.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  let checklist;
  try {
    checklist = parseChecklistState(body);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Enter valid brew-day checklist data.",
      },
      { status: 400 }
    );
  }

  const access = await getAccessibleBatch(
    params.id,
    context.user.id,
    context.serviceRole
  );
  if ("response" in access) return access.response;

  const { error } = await context.serviceRole
    .from("batches")
    .update({ brew_day_checklist: { version: 1, ...checklist } })
    .eq("id", params.id);
  if (error) {
    console.error("Could not save batch brew-day checklist", error);
    if (missingMigration(error.code)) {
      return NextResponse.json(
        { error: "Apply the brew-day checklist database migration to save progress." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not save batch brew-day checklist" },
      { status: 500 }
    );
  }

  return NextResponse.json({ saved: true });
}
