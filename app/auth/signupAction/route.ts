export const runtime = "edge";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("signupAction: START");

  const { supabase, responseHeaders } = createRouteHandlerClient(req);
  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  console.log("signupAction: username =", username);
  console.log("signupAction: email =", email);

  // -----------------------------
  // PASSWORD VALIDATION
  // -----------------------------
  function validatePassword(pw: string) {
    if (pw.length < 8) return "too_short";
    if (!/[A-Z]/.test(pw)) return "no_uppercase";
    return null;
  }

  const pwError = validatePassword(password);
  if (pwError) {
    console.error("SIGNUP ERROR: Weak password:", pwError);

    const res = new NextResponse(null, { status: 302 });
    responseHeaders.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Location", `/auth/signup?error=${pwError}`);

    return res;
  }

  // -----------------------------
  // SUPABASE SIGNUP
  // -----------------------------
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  console.log("signupAction: supabase response =", { data, error });

  if (error) {
    console.error("SIGNUP ERROR", error);

    const res = new NextResponse(null, { status: 302 });
    responseHeaders.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Location", "/auth/signup?error=supabase");

    return res;
  }

  // -----------------------------
  // CREATE PROFILE
  // -----------------------------
  if (data.user) {
    await supabase.from("profiles").insert({
      id: data.user.id,
      username,
    });
  }

  // -----------------------------
  // AUTO-LOGIN (Supabase does NOT auto-login on signUp)
  // -----------------------------
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

      const res = new NextResponse(null, { status: 302 });
      responseHeaders.forEach((value, key) => res.headers.set(key, value));
      res.headers.append("Location", "/auth/login?error=autologin");

      return res;
    }
  }

  // -----------------------------
  // SUCCESS → REDIRECT TO DASHBOARD
  // -----------------------------
  console.log("signupAction: SUCCESS → redirect to /dashboard");

  const res = new NextResponse(null, { status: 302 });
  responseHeaders.forEach((value, key) => res.headers.set(key, value));
  res.headers.append("Location", "/dashboard");

  return res;
}
