import { NextResponse } from "next/server";
import { createServerClient } from "../../lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;

  const email = `${username}@example.com`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return NextResponse.redirect("https://batchlogg.vercel.app/signup?error=1");
  }

  // Etter signup → send bruker til login
  return NextResponse.redirect("https://batchlogg.vercel.app/login");
}
