export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("signupAction: START");

  const supabase = supabaseServer();

  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  function validatePassword(pw: string) {
    if (pw.length < 8) return "too_short";
    if (!/[A-Z]/.test(pw)) return "no_uppercase";
    return null;
  }

  const pwError = validatePassword(password);
  if (pwError) {
    return NextResponse.redirect(
      new URL(`/auth/signup?error=${pwError}`, req.url)
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/auth/signup?error=supabase", req.url)
    );
  }

  if (data.user) {
    await supabase.from("profiles").insert({
      id: data.user.id,
      username,
    });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      return NextResponse.redirect(
        new URL("/auth/login?error=1", req.url)
      );
    }
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
