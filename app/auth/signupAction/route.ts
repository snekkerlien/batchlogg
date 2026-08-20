export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("SUPABASE_URL", process.env.SUPABASE_URL);
  console.log("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY?.slice(0, 10));

  const { supabase, responseHeaders } = createRouteHandlerClient(req);
  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  // -----------------------------
  // SERVER-SIDE PASSWORD VALIDATION
  // -----------------------------
  function validatePassword(pw: string) {
    if (pw.length < 8) return "too_short";
    if (!/[A-Z]/.test(pw)) return "no_uppercase";
    return null;
  }

  const pwError = validatePassword(password);
  if (pwError) {
    console.error("SIGNUP ERROR: Weak password:", pwError);

    return new NextResponse(null, {
      status: 302,
      headers: {
        ...responseHeaders,
        Location: `https://batchlogg.vercel.app/auth/signup?error=${pwError}`,
      },
    });
  }

  // -----------------------------
  // SUPABASE SIGNUP
  // -----------------------------
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("SIGNUP ERROR", error);

    return new NextResponse(null, {
      status: 302,
      headers: {
        ...responseHeaders,
        Location: "https://batchlogg.vercel.app/auth/signup?error=supabase",
      },
    });
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
  // FETCH SESSION (Supabase does NOT auto-login on signUp)
  // -----------------------------
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // fallback: logg inn manuelt
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.error("AUTO-LOGIN FAILED", loginError);

      return new NextResponse(null, {
        status: 302,
        headers: {
          ...responseHeaders,
          Location: "https://batchlogg.vercel.app/auth/login?error=autologin",
        },
      });
    }
  }

  // -----------------------------
  // SUCCESS → DIRECT TO DASHBOARD
  // -----------------------------
  const res = new NextResponse(null, { status: 302 });

  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  res.headers.set("Location", "https://batchlogg.vercel.app/dashboard");

  return res;
}
