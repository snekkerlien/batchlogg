import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function POST(request: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { username?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.username !== "string") {
    return NextResponse.json({ error: "Enter a username." }, { status: 400 });
  }

  const username = body.username.trim().toLowerCase();
  if (!username || username.length > 64) {
    return NextResponse.json(
      { error: "Username must be between 1 and 64 characters." },
      { status: 400 }
    );
  }

  const pattern = username.replace(/[\\%_*]/g, "\\$&");
  const { data: matchingProfiles, error: lookupError } = await serviceRole
    .from("profiles")
    .select("id")
    .ilike("username", pattern)
    .neq("id", user.id)
    .limit(1);

  if (lookupError) {
    console.error("Could not check username availability", lookupError);
    return NextResponse.json(
      { error: "Could not check username availability." },
      { status: 500 }
    );
  }
  if (matchingProfiles.length > 0) {
    return NextResponse.json(
      { error: "That username is already taken. Please choose another." },
      { status: 409 }
    );
  }

  const { error: updateError } = await serviceRole
    .from("profiles")
    .update({ username })
    .eq("id", user.id);

  if (updateError) {
    console.error("Could not update username", updateError);
    return NextResponse.json(
      {
        error:
          updateError.code === "23505"
            ? "That username is already taken. Please choose another."
            : "Could not update username.",
      },
      { status: updateError.code === "23505" ? 409 : 500 }
    );
  }

  return NextResponse.json({ username });
}
