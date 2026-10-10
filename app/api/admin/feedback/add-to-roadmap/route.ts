export const dynamic = "force-dynamic";
export const runtime = "nodejs";


import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const form = await req.formData();
  const feedbackId = form.get("feedbackId") as string;

  // REAL service role client (bypasses ALL RLS)
  const serviceRole = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch feedback BEFORE deleting it
  const { data: feedback, error: fetchError } = await serviceRole
    .from("feedback")
    .select("*")
    .eq("id", feedbackId)
    .single();

  if (fetchError || !feedback) {
    return NextResponse.redirect(
      new URL("/admin/feedback?error=notfound", req.url)
    );
  }

  // 2. Insert into roadmap
console.log("INSERT START", {
  feedback_id: feedback.id,
  user_id: feedback.user_id,
  category: feedback.category,
  message: feedback.message,
});

const { error: roadmapError } = await serviceRole
  .from("roadmap")
  .insert({
    feedback_id: feedback.id,
    user_id: feedback.user_id,
    category: feedback.category,
    message: feedback.message,
    status: "pending",
  });

console.log("INSERT END", roadmapError);
console.log("SUPABASE URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SERVICE ROLE KEY STARTS WITH", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10));


  if (roadmapError) {
    return NextResponse.redirect(
      new URL("/admin/feedback?error=roadmap", req.url)
    );
  }

  // 3. Delete feedback AFTER successful insert
  await serviceRole.from("feedback").delete().eq("id", feedbackId);

  // 4. Revalidate pages
  revalidatePath("/admin/feedback");
  revalidatePath("/admin/roadmap");

  // 5. Redirect
  return NextResponse.redirect(
    new URL("/admin/feedback?added=1", req.url)
  );
}
