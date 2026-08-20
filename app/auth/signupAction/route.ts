export const runtime = "edge";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("signupAction: START");

  const { supabase } = createRouteHandlerClient();
  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  console.log("signupAction: username =", username);
  console.log("signupAction: email =", email);

  function validatePassword(pw: string) {
    if (pw.length < 8) return "too_short";
    if (!/[A-Z]/.test(pw)) return "no_uppercase";
    return null;
  }

  const pwError = validatePassword(password);
  if (pwError) {
    console.error("SIGNUP ERROR:", pwError);
    return NextResponse.redirect(`/auth/signup?error=${pwError}`);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  console.log("signupAction: supabase response =", { data, error });

  if (error) {
    console.error("SIGNUP ERROR", error);
    return NextResponse.redirect("/auth/signup?error=supabase");
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
    console.log("signupAction: no session → auto-login");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.error("AUTO-LOGIN FAILED", loginError);
      return NextResponse.redirect(new URL("/auth/login?error=1", req.url));
    }
  }

  console.log("signupAction: SUCCESS → redirect to /dashboard");
  return NextResponse.redirect(new URL("/dashboard", req.url));

}
