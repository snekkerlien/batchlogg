export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const form = await req.formData();

  const username = form.get("username") as string;
  const email = form.get("email") as string;
  const password = form.get("password") as string;
  const confirmPassword = form.get("confirmPassword") as string;

  // Basic validation
  if (!username || !email || !password || !confirmPassword) {
    return NextResponse.redirect(
      new URL(`/auth/signup?error=missing_fields`, req.url)
    );
  }

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

  if (password !== confirmPassword) {
    return NextResponse.redirect(
      new URL(`/auth/signup?error=nomatch`, req.url)
    );
  }

  // ⭐ KUN nødvendig endring:
  const { supabase: supabaseAuth, serviceRole: supabaseAdmin } = await supabaseServer();

  // Create user in Supabase Auth
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.log("[signupAction] SIGNUP ERROR:", error);
    return NextResponse.redirect(
      new URL(`/auth/signup?error=supabase`, req.url)
    );
  }

  if (!data.user) {
    console.log("[signupAction] No user returned from signUp");
    return NextResponse.redirect(
      new URL(`/auth/signup?error=nouser`, req.url)
    );
  }

  // Create profile row
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: data.user.id,
      username: username.toLowerCase(),
      email,
      avatar_url: null,
      is_public: true,
    });

  if (profileError) {
    console.log("[signupAction] PROFILE ERROR:", profileError);
    return NextResponse.redirect(
      new URL(`/auth/signup?error=profile`, req.url)
    );
  }

  // Manual login
  const { data: loginData, error: loginError } =
    await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

  if (loginError || !loginData.session) {
    console.log("[signupAction] LOGIN FAILED");
    return NextResponse.redirect(
      new URL(`/auth/login?error=login_failed`, req.url)
    );
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
