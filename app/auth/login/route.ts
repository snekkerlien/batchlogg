import { NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;

  // Fake email → matcher signup
  const email = `${username}@example.com`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.redirect("/login?error=1");
  }

  return NextResponse.redirect("/dashboard");
}
