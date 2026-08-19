export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("loginAction: START");

  const { supabase, responseHeaders } = createRouteHandlerClient(req);
  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  console.log("loginAction: username =", username);
  console.log("loginAction: email =", email);

  // -----------------------------
  // TRY LOGIN
  // -----------------------------
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("loginAction: supabase response =", { data, error });

  // -----------------------------
  // LOGIN FAILED
  // -----------------------------
  if (error) {
    console.log("loginAction: LOGIN FAILED");

    const res = new NextResponse(null, { status: 302 });

    // copy Set-Cookie headers
    responseHeaders.forEach((value, key) => {
      res.headers.set(key, value);
    });

    res.headers.set("Location", "/auth/login?error=1");

    console.log("loginAction: redirecting to /auth/login?error=1");

    return res;
  }

  // -----------------------------
  // LOGIN SUCCESS
  // -----------------------------
  console.log("loginAction: LOGIN SUCCESS");

  const res = new NextResponse(null, { status: 302 });

  // copy Set-Cookie headers
  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  res.headers.set("Location", "/dashboard");

  console.log("loginAction: redirecting to /dashboard");

  return res;
}
