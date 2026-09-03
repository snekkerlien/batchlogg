import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { id } = await req.json();

  const { supabase } = supabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase
    .from("batches")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
