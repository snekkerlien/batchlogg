import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import type { WaterIonProfile } from "@/lib/brewing/waterChemistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ION_FIELDS: (keyof WaterIonProfile)[] = [
  "calcium",
  "magnesium",
  "sodium",
  "chloride",
  "sulfate",
  "bicarbonate",
];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProfileValues = {
  name: string;
  source_ions: WaterIonProfile;
  target_ions: WaterIonProfile;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateIons(value: unknown): WaterIonProfile | null {
  if (!isRecord(value)) return null;
  const entries = ION_FIELDS.map((field) => value[field]);
  if (
    entries.some(
      (amount) =>
        (typeof amount !== "number" && typeof amount !== "string") ||
        (typeof amount === "string" && !amount.trim()) ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) < 0 ||
        Number(amount) > 10000
    )
  ) {
    return null;
  }
  return Object.fromEntries(
    ION_FIELDS.map((field) => [field, Number(value[field])])
  ) as WaterIonProfile;
}

function validateProfile(value: unknown): ProfileValues | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const source_ions = validateIons(value.source_ions);
  const target_ions = validateIons(value.target_ions);
  if (!name || name.length > 80 || !source_ions || !target_ions) return null;
  return { name, source_ions, target_ions };
}

async function getAuthenticatedContext() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error, serviceRole };
}

const PROFILE_COLUMNS =
  "id, name, source_ions, target_ions, created_at, updated_at";

function databaseErrorResponse(message: string, code?: string) {
  if (["42P01", "PGRST205"].includes(code ?? "")) {
    return NextResponse.json(
      { error: "Apply the water chemistry profiles migration to save profiles." },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET() {
  const { user, error: authError, serviceRole } = await getAuthenticatedContext();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await serviceRole
    .from("water_chemistry_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .order("name", { ascending: true });
  if (error) {
    console.error("Could not load water chemistry profiles", error);
    return databaseErrorResponse("Could not load water chemistry profiles", error.code);
  }
  return NextResponse.json({ profiles: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { user, error: authError, serviceRole } = await getAuthenticatedContext();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const values = validateProfile(body);
  if (!values) {
    return NextResponse.json({ error: "Enter a name and valid ion values." }, { status: 400 });
  }

  const { count, error: countError } = await serviceRole
    .from("water_chemistry_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) {
    console.error("Could not check water chemistry profile limit", countError);
    return databaseErrorResponse(
      "Could not save water chemistry profile",
      countError.code
    );
  }
  if ((count ?? 0) >= 20) {
    return NextResponse.json(
      { error: "You can save up to 20 water chemistry profiles." },
      { status: 409 }
    );
  }

  const { data, error } = await serviceRole
    .from("water_chemistry_profiles")
    .insert({ ...values, user_id: user.id })
    .select(PROFILE_COLUMNS)
    .single();
  if (error) {
    console.error("Could not create water chemistry profile", error);
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "A water profile with this name already exists."
            : "Could not save water chemistry profile.",
      },
      { status: error.code === "23505" ? 409 : 500 }
    );
  }
  return NextResponse.json({ profile: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { user, error: authError, serviceRole } = await getAuthenticatedContext();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.id !== "string" || !UUID_PATTERN.test(body.id)) {
    return NextResponse.json({ error: "Invalid water profile ID" }, { status: 400 });
  }
  const values = validateProfile(body);
  if (!values) {
    return NextResponse.json({ error: "Enter a name and valid ion values." }, { status: 400 });
  }

  const { data, error } = await serviceRole
    .from("water_chemistry_profiles")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  if (error) {
    console.error("Could not update water chemistry profile", error);
    if (["42P01", "PGRST205"].includes(error.code ?? "")) {
      return databaseErrorResponse(
        "Could not update water chemistry profile",
        error.code
      );
    }
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "A water profile with this name already exists."
            : "Could not update water chemistry profile.",
      },
      { status: error.code === "23505" ? 409 : 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Water chemistry profile not found" }, { status: 404 });
  }
  return NextResponse.json({ profile: data });
}

export async function DELETE(request: NextRequest) {
  const { user, error: authError, serviceRole } = await getAuthenticatedContext();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id || !UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Water profile ID is required" }, { status: 400 });
  }
  const { data, error } = await serviceRole
    .from("water_chemistry_profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not delete water chemistry profile", error);
    return databaseErrorResponse(
      "Could not delete water chemistry profile",
      error.code
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Water chemistry profile not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
