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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // -----------------------------
  // LOGIN FAILED
  // -----------------------------
  if (error) {
    console.error("LOGIN ERROR", error);

    const res = new NextResponse(null, { status: 302 });

    // copy Set-Cookie headers correctly
    responseHeaders.forEach((value, key) => {
      res.headers.set(key, value);
    });

    res.headers.set(
      "Location",
      "https://batchlogg.vercel.app/auth/login?error=1"
    );

    return res;
  }

  // -----------------------------
  // LOGIN SUCCESS
  // -----------------------------
  const res = new NextResponse(null, { status: 302 });

  // copy Set-Cookie headers correctly
  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  res.headers.set("Location", "https://batchlogg.vercel.app/dashboard");

  return res;
}
