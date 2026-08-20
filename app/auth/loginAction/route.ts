export const runtime = "edge";

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
  // PREPARE RESPONSE
  // -----------------------------
  const res = new NextResponse(null, { status: 302 });

  // Copy Set-Cookie headers from Supabase SSR
  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  // -----------------------------
  // LOGIN FAILED
  // -----------------------------
  if (error) {
    console.log("loginAction: LOGIN FAILED");
    res.headers.set("Location", "/auth/login?error=1");
    return res;
  }

  // -----------------------------
  // LOGIN SUCCESS
  // -----------------------------
  console.log("loginAction: LOGIN SUCCESS");
  res.headers.set("Location", "/dashboard");
  return res;
}
