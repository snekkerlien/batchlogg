export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("loginAction triggered");

  // TESTRESPONS – sjekk om route fungerer i det hele tatt
  return new Response("OK", { status: 200 });

  // Hvis denne fungerer, kan vi aktivere resten igjen:
  /*
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

  if (error) {
    console.error("LOGIN ERROR", error);

    const res = new NextResponse(null, { status: 302 });

    responseHeaders.forEach((value, key) => {
      res.headers.set(key, value);
    });

    res.headers.set(
      "Location",
      "https://batchlogg.vercel.app/auth/login?error=1"
    );

    return res;
  }

  const res = new NextResponse(null, { status: 302 });

  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  res.headers.set("Location", "https://batchlogg.vercel.app/dashboard");

  return res;
  */
}
