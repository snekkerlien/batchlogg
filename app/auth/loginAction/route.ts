export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  console.log("=== loginAction START ===");

  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  console.log("[loginAction] username =", username);
  console.log("[loginAction] email =", email);

  // Supabase-klient (kun JWT, ingen cookies)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  console.log("[loginAction] Prøver signInWithPassword...");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("[loginAction] Supabase response:", { data, error });

  if (error || !data.session) {
    console.log("[loginAction] LOGIN FAILED:", error);

    const url = new URL("/auth/login", req.url);
    url.searchParams.set("error", "1");

    console.log("[loginAction] Redirect → /auth/login?error=1");

    return NextResponse.redirect(url);
  }

  console.log("[loginAction] LOGIN SUCCESS");
  console.log("[loginAction] Session:", data.session);

  console.log("=== loginAction END ===");

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
