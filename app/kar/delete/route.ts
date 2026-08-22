export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("=== DELETE SINGLE KAR START ===");

  const form = await req.formData();
  const karId = form.get("kar_id")?.toString() ?? "";

  console.log("Kar ID mottatt:", karId);

  const { supabase } = supabaseServer();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  console.log("Bruker:", user);
  console.log("UserError:", userError);

  if (!user) {
    console.log("Ingen bruker funnet → redirect til login");
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const { data, error } = await supabase
    .from("kar")
    .delete()
    .eq("id", karId);

  console.log("Delete result:", data);
  console.log("Delete error:", error);

  console.log("=== DELETE SINGLE KAR END ===");

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
