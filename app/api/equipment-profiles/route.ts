import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_FIELDS = [
  "name",
  "boil_off_rate_l_per_hour",
  "kettle_loss_l",
  "grain_absorption_l_per_kg",
  "mash_ratio_l_per_kg",
  "mash_tun_dead_space_l",
] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProfileField = (typeof PROFILE_FIELDS)[number];
type ProfileValues = Record<ProfileField, string | number>;

const LIMITS: Record<Exclude<ProfileField, "name">, [number, number]> = {
  boil_off_rate_l_per_hour: [0, 100],
  kettle_loss_l: [0, 1000],
  grain_absorption_l_per_kg: [0, 5],
  mash_ratio_l_per_kg: [0.1, 10],
  mash_tun_dead_space_l: [0, 1000],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateProfile(value: unknown): ProfileValues | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name || name.length > 80) return null;

  const result: ProfileValues = {
    name,
    boil_off_rate_l_per_hour: 0,
    kettle_loss_l: 0,
    grain_absorption_l_per_kg: 0.8,
    mash_ratio_l_per_kg: 3,
    mash_tun_dead_space_l: 0,
  };

  for (const field of PROFILE_FIELDS) {
    if (field === "name") continue;
    const amount = value[field];
    if (
      (typeof amount !== "number" && typeof amount !== "string") ||
      (typeof amount === "string" && !amount.trim())
    ) {
      return null;
    }
    const numericAmount = Number(amount);
    const [minimum, maximum] = LIMITS[field];
    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < minimum ||
      numericAmount > maximum
    ) {
      return null;
    }
    result[field] = numericAmount;
  }
  return result;
}

async function getAuthenticatedContext() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error, serviceRole };
}

export async function GET() {
  const { user, error: authError, serviceRole } = await getAuthenticatedContext();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await serviceRole
    .from("equipment_profiles")
    .select(
      "id, name, boil_off_rate_l_per_hour, kettle_loss_l, grain_absorption_l_per_kg, mash_ratio_l_per_kg, mash_tun_dead_space_l, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("name", { ascending: true });
  if (error) {
    console.error("Could not load equipment profiles", error);
    if (["42P01", "PGRST205"].includes(error.code ?? "")) {
      return NextResponse.json(
        { error: "Apply the equipment profiles database migration to save equipment settings." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Could not load equipment profiles" }, { status: 500 });
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
    return NextResponse.json({ error: "Enter valid equipment settings." }, { status: 400 });
  }

  const { count, error: countError } = await serviceRole
    .from("equipment_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) {
    console.error("Could not check equipment profile limit", countError);
    return NextResponse.json({ error: "Could not save equipment profile" }, { status: 500 });
  }
  if ((count ?? 0) >= 20) {
    return NextResponse.json(
      { error: "You can save up to 20 equipment profiles." },
      { status: 409 }
    );
  }

  const { data, error } = await serviceRole
    .from("equipment_profiles")
    .insert({ ...values, user_id: user.id })
    .select(
      "id, name, boil_off_rate_l_per_hour, kettle_loss_l, grain_absorption_l_per_kg, mash_ratio_l_per_kg, mash_tun_dead_space_l, created_at, updated_at"
    )
    .single();
  if (error) {
    console.error("Could not create equipment profile", error);
    return NextResponse.json(
      { error: error.code === "23505" ? "A profile with this name already exists." : "Could not save equipment profile." },
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
    return NextResponse.json({ error: "Invalid equipment profile ID" }, { status: 400 });
  }
  const values = validateProfile(body);
  if (!values) {
    return NextResponse.json({ error: "Enter valid equipment settings." }, { status: 400 });
  }

  const { data, error } = await serviceRole
    .from("equipment_profiles")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select(
      "id, name, boil_off_rate_l_per_hour, kettle_loss_l, grain_absorption_l_per_kg, mash_ratio_l_per_kg, mash_tun_dead_space_l, created_at, updated_at"
    )
    .maybeSingle();
  if (error) {
    console.error("Could not update equipment profile", error);
    return NextResponse.json(
      { error: error.code === "23505" ? "A profile with this name already exists." : "Could not update equipment profile." },
      { status: error.code === "23505" ? 409 : 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Equipment profile not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Equipment profile ID is required" }, { status: 400 });
  }
  const { data, error } = await serviceRole
    .from("equipment_profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not delete equipment profile", error);
    return NextResponse.json({ error: "Could not delete equipment profile" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Equipment profile not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
