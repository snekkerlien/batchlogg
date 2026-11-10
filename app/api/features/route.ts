export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { isFeatureEnabled } from "@/lib/features/toggles";
import { getMembershipRole } from "@/lib/auth/permissions";

export async function GET() {
  const { supabase } = await supabaseServer();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const role = await getMembershipRole(supabase, user);
    const [businessEnabled, breweryReviewsEnabled] = await Promise.all([
      isFeatureEnabled(supabase, "business-accounts"),
      isFeatureEnabled(supabase, "brewery-reviews"),
    ]);

    return NextResponse.json({
      "business-accounts": businessEnabled || role === "developer",
      "brewery-reviews": breweryReviewsEnabled || role === "developer",
    });
  } catch (error) {
    console.error("Error fetching feature toggles:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch feature toggles",
        "business-accounts": false,
        "brewery-reviews": false,
      },
      { status: 500 }
    );
  }
}
