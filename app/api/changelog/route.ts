import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { serviceRole } = supabaseServer();
  const now = new Date().toISOString();
  const [
    { data: changelog, error: changelogError },
    { data: announcements, error: announcementsError },
  ] = await Promise.all([
    serviceRole
      .from("site_changelog")
      .select("version, entry_date, title, body")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceRole
      .from("site_announcements")
      .select("id, title, body, starts_at, ends_at")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (changelogError || announcementsError) {
    console.error("Could not load site updates", changelogError || announcementsError);
    return NextResponse.json({ error: "Could not load site updates" }, { status: 500 });
  }

  return NextResponse.json({
    changelog: changelog
      ? {
          version: changelog.version,
          date: changelog.entry_date,
          title: changelog.title,
          body: changelog.body,
        }
      : null,
    announcement: announcements ?? null,
  });
}
