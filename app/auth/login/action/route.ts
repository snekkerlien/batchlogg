import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../../lib/supabase/supabaseServerNew";

export async function POST(req: Request) {
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
    return new NextResponse(null, {
      status: 302,
      headers: {
        ...responseHeaders,
        Location: "https://batchlogg.vercel.app/auth/login?error=1",
      },
    });
  }

  return new NextResponse(null, {
    status: 302,
    headers: {
      ...responseHeaders,
      Location: "https://batchlogg.vercel.app/dashboard",
    },
  });
}
