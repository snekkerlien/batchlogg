import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseAbv(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return undefined;
  return parsed;
}

const serviceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const { data, error } = await serviceRole
      .from("kegs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keg: data ?? null });
  }

  const { data, error } = await serviceRole
    .from("kegs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kegs: data ?? [] });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const action = body?.action ?? "update";

  if (action === "create") {
  // Fetch existing keg names to determine next number
  const { data: existingKegs, error: fetchError } = await serviceRole
    .from("kegs")
    .select("name");

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Extract numbers from names like "Keg 1", "Keg 2", etc.
  let nextNumber = 1;

  if (existingKegs && existingKegs.length > 0) {
    const numbers = existingKegs
      .map(k => parseInt(String(k.name).replace(/[^0-9]/g, ""), 10))
      .filter(n => !isNaN(n));

    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1;
    }
  }

  const { data, error } = await serviceRole
    .from("kegs")
    .insert([
      {
        name: `Keg ${nextNumber}`,
        brew_name: "",
        abv: null,
        brew_date: null,
        notes: "",
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keg: data });
}


  if (action === "update") {
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ error: "Missing keg id" }, { status: 400 });
    }

    const abv = parseAbv(body.abv);
    if (body.abv !== undefined && abv === undefined) {
      return NextResponse.json(
        { error: "ABV must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    if (
      body.brew_date !== undefined &&
      body.brew_date !== null &&
      body.brew_date !== "" &&
      !isValidDate(body.brew_date)
    ) {
      return NextResponse.json({ error: "Date must be a valid date" }, { status: 400 });
    }

    const { data, error } = await serviceRole
      .from("kegs")
      .update({
        name: typeof body.name === "string" ? body.name : undefined,
        brew_name: typeof body.brew_name === "string" ? body.brew_name : undefined,
        abv,
        brew_date:
          body.brew_date === null || body.brew_date === ""
            ? null
            : typeof body.brew_date === "string"
              ? body.brew_date
              : undefined,
        notes: typeof body.notes === "string" ? body.notes : undefined,
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keg: data });
  }

  if (action === "delete") {
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "No keg ids supplied" }, { status: 400 });
    }

    const { error } = await serviceRole.from("kegs").delete().in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
