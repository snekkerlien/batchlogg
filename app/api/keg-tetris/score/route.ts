import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await serviceRole
    .from("keg_tetris_scores")
    .select("high_score")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Could not load Keg Tetris high score", error);
    return NextResponse.json(
      { error: "Could not load your high score." },
      { status: 500 }
    );
  }

  return NextResponse.json({ highScore: data?.high_score ?? null });
}

export async function POST(request: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { score?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    typeof body.score !== "number" ||
    !Number.isSafeInteger(body.score) ||
    body.score < 0 ||
    body.score > 1_000_000_000
  ) {
    return NextResponse.json({ error: "A valid score is required." }, { status: 400 });
  }

  const { data, error } = await serviceRole.rpc("save_keg_tetris_high_score", {
    p_user_id: user.id,
    p_score: body.score,
  });

  if (error) {
    console.error("Could not save Keg Tetris high score", error);
    return NextResponse.json(
      { error: "Could not save your high score." },
      { status: 500 }
    );
  }

  return NextResponse.json({ highScore: data });
}
