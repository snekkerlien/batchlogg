export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole } from "@/lib/auth/permissions";
import { getAllFeatureToggles, updateFeatureToggle } from "@/lib/features/toggles";
import type { FeatureToggleKey } from "@/lib/features/toggles";

async function authorize() {
  const { supabase, serviceRole } = supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const role = await getMembershipRole(supabase, user);
  return role === "developer" ? { user, serviceRole } : null;
}

function isFeatureToggleKey(key: unknown): key is FeatureToggleKey {
  return key === "business-accounts" || key === "brewery-reviews";
}

export async function GET() {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    return NextResponse.json(await getAllFeatureToggles(context.serviceRole));
  } catch (error) {
    console.error("Error fetching feature toggles:", error);
    return NextResponse.json(
      { error: "Could not load feature toggles. Check the server logs and database migrations." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("key" in body) || !("enabled" in body) ||
      !isFeatureToggleKey(body.key) || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid feature toggle update." }, { status: 400 });
  }
  try {
    const result = await updateFeatureToggle(context.serviceRole, body.key, body.enabled, context.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating feature toggle:", error);
    return NextResponse.json(
      { error: "Could not update feature toggle. Check the server logs." },
      { status: 500 }
    );
  }
}
