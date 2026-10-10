import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const form = await req.formData();
  const feedbackId = form.get("feedbackId") as string;

  const { serviceRole } = supabaseServer();

  // Delete feedback
  await serviceRole.from("feedback").delete().eq("id", feedbackId);

  revalidatePath("/admin/feedback");

  return NextResponse.redirect(new URL("/admin/feedback?deleted=1", req.url));
}
