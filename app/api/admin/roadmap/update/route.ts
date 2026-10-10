import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const form = await req.formData();
  const id = form.get("id") as string;
  const status = form.get("status") as string;

  const { serviceRole } = supabaseServer();

  const { error } = await serviceRole
    .from("roadmap")
    .update({ status })
    .eq("id", id);

  // Revalidate roadmap page
  revalidatePath("/admin/roadmap");

  if (error) {
    return NextResponse.redirect(new URL("/admin/roadmap?error=1", req.url));
  }

  // ⭐ Redirect back to roadmap page
  const redirectUrl = new URL("/admin/roadmap", req.url);
  return NextResponse.redirect(redirectUrl);
}
