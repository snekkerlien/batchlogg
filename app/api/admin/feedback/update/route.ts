import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = form.get("id")?.toString();
  const status = form.get("status")?.toString();

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  const { serviceRole } = supabaseServer();

  const { error } = await serviceRole
    .from("feedback")
    .update({ status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const redirectUrl = new URL("/admin/feedback", request.url);
    return NextResponse.redirect(redirectUrl);

}
