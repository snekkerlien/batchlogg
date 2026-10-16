import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { getAnalyticsMetrics } from "@/lib/analytics/analyticsMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const role = await getMembershipRole(supabase, user);
  if (!hasPermission(role, "view_analytics")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const generatedAt = new Date();
    const metrics = await getAnalyticsMetrics(serviceRole, generatedAt);
    return NextResponse.json({ generatedAt: generatedAt.toISOString(), metrics });
  } catch (error) {
    console.error("Could not load admin analytics", error);
    return NextResponse.json({ error: "Could not load analytics" }, { status: 500 });
  }
}
