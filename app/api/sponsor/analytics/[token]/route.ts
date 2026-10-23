import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getAnalyticsMetrics } from "@/lib/analytics/analyticsMetrics";
import { isSponsorAnalyticsTokenValid } from "@/lib/analytics/sponsorShare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const { serviceRole } = supabaseServer();
  try {
    if (!(await isSponsorAnalyticsTokenValid(serviceRole, params.token))) {
      return NextResponse.json({ error: "This sponsor link is invalid or expired." }, { status: 404 });
    }

    const generatedAt = new Date();
    const metrics = await getAnalyticsMetrics(serviceRole, generatedAt, {
      includeUserLifecycle: false,
    });
    return NextResponse.json(
      { generatedAt: generatedAt.toISOString(), metrics },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Could not load sponsor analytics", error);
    return NextResponse.json({ error: "Could not load analytics" }, { status: 500 });
  }
}
