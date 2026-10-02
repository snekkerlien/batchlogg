import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { serviceRole } = await supabaseServer();
  const body = await req.json();
  const { id, username, email } = body;
  if (
    id !== user.id ||
    typeof username !== "string" ||
    typeof email !== "string" ||
    !username.trim() ||
    !email.trim()
  ) {
    return NextResponse.json({ error: "Invalid profile details." }, { status: 400 });
  }

  const profileData = {
    username: username.trim().toLowerCase(),
    email: email.trim(),
  };
  const { data: updatedProfile, error: updateError } = await serviceRole
    .from("profiles")
    .update(profileData)
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Could not update signup profile", updateError);
    return NextResponse.json(
      { error: "Account created, but profile setup failed. Please contact support." },
      { status: 500 }
    );
  }

  if (!updatedProfile) {
    const { error: insertError } = await serviceRole.from("profiles").insert({
      id: user.id,
      ...profileData,
      avatar_url: null,
      is_public: true,
      can_manage_kegs: false,
    });

    if (insertError) {
      console.error("Could not create signup profile", insertError);
      return NextResponse.json(
        { error: "Account created, but profile setup failed. Please contact support." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
