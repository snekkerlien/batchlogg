import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { premiumGateResponse } from "@/lib/auth/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateItem(value: unknown) {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const amount = Number(value.amount);
  const unit = typeof value.unit === "string" ? value.unit.trim() : "";
  const recipeId = value.recipe_id;
  if (
    !name ||
    name.length > 200 ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 1_000_000 ||
    unit.length > 32 ||
    (recipeId !== null && recipeId !== undefined &&
      (typeof recipeId !== "string" || !UUID_PATTERN.test(recipeId)))
  ) {
    return null;
  }
  return {
    name,
    amount,
    unit,
    recipe_id: typeof recipeId === "string" ? recipeId : null,
    is_checked: value.is_checked === true,
  };
}

async function getAuthenticatedUser() {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
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
  const accessDenied = await premiumGateResponse(serviceRole, user.id);
  if (accessDenied) return accessDenied;

  const { data, error } = await serviceRole
    .from("shopping_list_items")
    .select("id, recipe_id, name, amount, unit, is_checked, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Could not load shopping list", error);
    return NextResponse.json({ error: "Could not load shopping list" }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const sourceItems = isRecord(body) && Array.isArray(body.items) ? body.items : [body];
  if (sourceItems.length === 0 || sourceItems.length > 100) {
    return NextResponse.json({ error: "Add between 1 and 100 shopping-list items" }, { status: 400 });
  }
  const items = sourceItems.map(validateItem);
  if (items.some((item) => item === null)) {
    return NextResponse.json({ error: "One or more shopping-list items are invalid" }, { status: 400 });
  }

  const { serviceRole } = supabaseServer();
  const accessDenied = await premiumGateResponse(serviceRole, user.id);
  if (accessDenied) return accessDenied;
  const validItems = items.filter(
    (item): item is NonNullable<typeof item> => item !== null
  );
  const recipeIds = [...new Set(validItems.flatMap((item) => item.recipe_id ? [item.recipe_id] : []))];
  if (recipeIds.length > 0) {
    const { data: ownedRecipes, error: recipesError } = await serviceRole
      .from("recipes")
      .select("id")
      .eq("user_id", user.id)
      .in("id", recipeIds);
    if (recipesError) {
      console.error("Could not verify shopping-list recipe ownership", recipesError);
      return NextResponse.json({ error: "Could not verify recipe ownership" }, { status: 500 });
    }
    if ((ownedRecipes ?? []).length !== recipeIds.length) {
      return NextResponse.json({ error: "One or more recipes are unavailable" }, { status: 404 });
    }
  }

  const { data, error } = await serviceRole
    .from("shopping_list_items")
    .insert(validItems.map((item) => ({ ...item, user_id: user.id })))
    .select("id, recipe_id, name, amount, unit, is_checked, created_at, updated_at");
  if (error) {
    console.error("Could not add shopping-list items", error);
    return NextResponse.json({ error: "Could not add shopping-list items" }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
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
    return NextResponse.json({ error: "A valid shopping-list item ID is required" }, { status: 400 });
  }

  const update: Record<string, string | number | boolean> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.is_checked === "boolean") update.is_checked = body.is_checked;
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name || name.length > 200) {
      return NextResponse.json({ error: "Enter an item name up to 200 characters" }, { status: 400 });
    }
    update.name = name;
  }
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
      return NextResponse.json({ error: "Enter a valid item amount" }, { status: 400 });
    }
    update.amount = amount;
  }
  if (typeof body.unit === "string") {
    const unit = body.unit.trim();
    if (unit.length > 32) {
      return NextResponse.json({ error: "Item units must be 32 characters or fewer" }, { status: 400 });
    }
    update.unit = unit;
  }
  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "No item changes provided" }, { status: 400 });
  }

  const { serviceRole } = supabaseServer();
  const accessDenied = await premiumGateResponse(serviceRole, user.id);
  if (accessDenied) return accessDenied;
  const { data, error } = await serviceRole
    .from("shopping_list_items")
    .update(update)
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not update shopping-list item", error);
    return NextResponse.json({ error: "Could not update shopping-list item" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Shopping-list item not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { serviceRole } = supabaseServer();
  const accessDenied = await premiumGateResponse(serviceRole, user.id);
  if (accessDenied) return accessDenied;
  const id = request.nextUrl.searchParams.get("id");
  if (id === null) {
    const { error } = await serviceRole
      .from("shopping_list_items")
      .delete()
      .eq("user_id", user.id);
    if (error) {
      console.error("Could not clear shopping list", error);
      return NextResponse.json({ error: "Could not clear shopping list" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "A valid shopping-list item ID is required" }, { status: 400 });
  }
  const { data, error } = await serviceRole
    .from("shopping_list_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not remove shopping-list item", error);
    return NextResponse.json({ error: "Could not remove shopping-list item" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Shopping-list item not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
