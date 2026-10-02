import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { serviceRole } = await supabaseServer();
  const body = await req.json();

  const { id, username, email } = body;

  await serviceRole.from("profiles").insert({
    id,
    username,
    email,          // ⭐ MÅ MED
    avatar_url: null,
    is_public: true,
    can_manage_kegs: false,
  });

  return NextResponse.json({ ok: true });
}
