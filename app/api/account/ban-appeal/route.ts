import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid appeal details" }, { status: 400 });
  }
  const message = "message" in body ? body.message : undefined;
  if (
    typeof message !== "string" ||
    message.trim().length < 3 ||
    message.trim().length > 3000
  ) {
    return NextResponse.json(
      { error: "Write between 3 and 3000 characters for your appeal." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { data: ban, error: banError } = await serviceRole
    .from("user_restrictions")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("restriction_type", "ban")
    .is("revoked_at", null)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .maybeSingle();
  if (banError) {
    console.error("Could not verify ban appeal eligibility", banError);
    return NextResponse.json({ error: "Could not verify your ban status." }, { status: 503 });
  }
  if (!ban) {
    return NextResponse.json(
      { error: "An appeal can only be sent while your account is banned." },
      { status: 403 }
    );
  }

  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not load ban appeal username", profileError);
    return NextResponse.json({ error: "Could not submit your appeal." }, { status: 500 });
  }

  const { error } = await serviceRole.from("feedback").insert({
    user_id: user.id,
    username: profile?.username ?? null,
    email: user.email ?? null,
    category: "ban_appeal",
    message: message.trim(),
  });
  if (error) {
    console.error("Could not submit ban appeal", error);
    return NextResponse.json({ error: "Could not submit your appeal." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
