export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  // midlertidig logging
  console.log("SUPABASE_URL", process.env.SUPABASE_URL);
  console.log("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY?.slice(0, 10));

  const { supabase, responseHeaders } = createRouteHandlerClient(req);
  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("SIGNUP ERROR", error);
    return new NextResponse(null, {
      status: 302,
      headers: {
        ...responseHeaders,
        Location: "https://batchlogg.vercel.app/auth/signup?error=1",
      },
    });
  }

  return new NextResponse(null, {
    status: 302,
    headers: {
      ...responseHeaders,
      Location: "https://batchlogg.vercel.app/auth/login",
    },
  });
}
