import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GAME_IDS = new Set([
  "brew-basics",
  "brew-day-sequence",
  "fermentation-detective",
  "recipe-builder",
  "brew-math-lab",
  "flavor-aroma",
]);

async function getUserAndClients() {
  const clients = supabaseServer();
  const {
    data: { user },
    error,
  } = await clients.supabase.auth.getUser();

  if (error || !user) return null;
  return { ...clients, user };
}

export async function GET() {
  const clients = await getUserAndClients();
  if (!clients) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await clients.serviceRole
    .from("brewing_academy_progress")
    .select(
      "game_id, attempt_count, total_questions, correct_answers, best_score, last_score, missed_question_counts, last_played_at"
    )
    .eq("user_id", clients.user.id)
    .order("last_played_at", { ascending: false });

  if (error) {
    console.error("Could not load Brewing Academy progress", error);
    return NextResponse.json(
      { error: "Could not load learning progress" },
      { status: 500 }
    );
  }

  return NextResponse.json({ progress: data });
}

export async function POST(request: NextRequest) {
  const clients = await getUserAndClients();
  if (!clients) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid attempt data" }, { status: 400 });
  }

  const { game_id, score, total_questions, missed_questions } = body as Record<
    string,
    unknown
  >;
  if (
    typeof game_id !== "string" ||
    !GAME_IDS.has(game_id) ||
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    typeof total_questions !== "number" ||
    !Number.isInteger(total_questions) ||
    total_questions !== 7 ||
    score < 0 ||
    score > total_questions ||
    !Array.isArray(missed_questions) ||
    missed_questions.length !== total_questions - score ||
    missed_questions.some(
      (question) =>
        typeof question !== "string" ||
        question.trim().length === 0 ||
        question.length > 500
    )
  ) {
    return NextResponse.json({ error: "Invalid attempt data" }, { status: 400 });
  }

  const { error } = await clients.serviceRole.rpc(
    "record_brewing_academy_attempt",
    {
      p_user_id: clients.user.id,
      p_game_id: game_id,
      p_score: score,
      p_total_questions: total_questions,
      p_missed_questions: missed_questions,
    }
  );

  if (error) {
    console.error("Could not save Brewing Academy attempt", error);
    return NextResponse.json(
      { error: "Could not save learning progress" },
      { status: 500 }
    );
  }

  return NextResponse.json({ saved: true });
}

export async function DELETE() {
  const clients = await getUserAndClients();
  if (!clients) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { error } = await clients.serviceRole
    .from("brewing_academy_progress")
    .delete()
    .eq("user_id", clients.user.id);

  if (error) {
    console.error("Could not reset Brewing Academy progress", error);
    return NextResponse.json(
      { error: "Could not reset learning progress" },
      { status: 500 }
    );
  }

  return NextResponse.json({ reset: true });
}
