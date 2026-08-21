export const runtime = "edge";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("signupAction: START");

  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  console.log("signupAction: username =", username);
  console.log("signupAction: email =", email);

  // Passordvalidering
  function validatePassword(pw: string) {
    if (pw.length < 8) return "too_short";
    if (!/[A-Z]/.test(pw)) return "no_uppercase";
    return null;
  }

  const pwError = validatePassword(password);
  if (pwError) {
    console.error("SIGNUP ERROR:", pwError);
    return NextResponse.redirect(
      new URL(`/auth/signup?error=${pwError}`, req.url)
    );
  }

  // Supabase signUp (supabase-js)
  const { data, error } = await supabaseServer.auth.signUp({
    email,
    password,
  });

  console.log("signupAction: supabase response =", { data, error });

  if (error) {
    console.error("SIGNUP ERROR", error);
    return NextResponse.redirect(
      new URL("/auth/signup?error=supabase", req.url)
    );
  }

  // Opprett profil
  if (data.user) {
    await supabaseServer.from("profiles").insert({
      id: data.user.id,
      username,
    });
  }

  // Supabase-js logger ikke inn automatisk etter signUp
  const {
    data: { session },
  } = await supabaseServer.auth.getSession();

  if (!session) {
    console.log("signupAction: no session → auto-login");

    const { error: loginError } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.error("AUTO-LOGIN FAILED", loginError);
      return NextResponse.redirect(
        new URL("/auth/login?error=1", req.url)
      );
    }
  }

  console.log("signupAction: SUCCESS → redirect to /dashboard");
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
