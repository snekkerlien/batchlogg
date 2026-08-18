import { NextResponse } from "next/server";
import { createServerActionClient } from "../../../../lib/supabaseServerAction";

export async function POST(req: Request) {
  const supabase = await createServerActionClient();
  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.redirect("/auth/login?error=1");
  }

  return NextResponse.redirect("/dashboard");
}
