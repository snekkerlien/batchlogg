import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";

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

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [
    { count: accounts, error: accountsError },
    { count: publicProfiles, error: publicProfilesError },
    { count: recipes, error: recipesError },
    { count: publicRecipes, error: publicRecipesError },
    { count: batches, error: batchesError },
    { count: topics, error: topicsError },
    { count: pendingReports, error: reportsError },
    { count: monthlySignups, error: signupsError },
  ] = await Promise.all([
    serviceRole.from("profiles").select("id", { count: "exact", head: true }),
    serviceRole.from("profiles").select("id", { count: "exact", head: true }).eq("is_public", true),
    serviceRole.from("recipes").select("id", { count: "exact", head: true }),
    serviceRole.from("recipes").select("id", { count: "exact", head: true }).eq("is_public", true),
    serviceRole.from("batches").select("id", { count: "exact", head: true }),
    serviceRole.from("forum_topics").select("id", { count: "exact", head: true }),
    serviceRole.from("community_reports").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
    serviceRole.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
  ]);
  const queryError =
    accountsError || publicProfilesError || recipesError || publicRecipesError ||
    batchesError || topicsError || reportsError || signupsError;
  if (queryError) {
    console.error("Could not load admin analytics", queryError);
    return NextResponse.json({ error: "Could not load analytics" }, { status: 500 });
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    metrics: {
      accounts: accounts ?? 0,
      publicProfiles: publicProfiles ?? 0,
      monthlySignups: monthlySignups ?? 0,
      recipes: recipes ?? 0,
      publicRecipes: publicRecipes ?? 0,
      batches: batches ?? 0,
      forumTopics: topics ?? 0,
      pendingReports: pendingReports ?? 0,
    },
  });
}
