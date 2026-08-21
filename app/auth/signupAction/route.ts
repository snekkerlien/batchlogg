export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  console.log("=== signupAction START ===");

  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  console.log("[signupAction] username =", username);
  console.log("[signupAction] email =", email);

  // Passordvalidering
  function validatePassword(pw: string) {
    if (pw.length < 8) return "too_short";
    if (!/[A-Z]/.test(pw)) return "no_uppercase";
    return null;
  }

  const pwError = validatePassword(password);
  if (pwError) {
    console.log("[signupAction] Passordfeil:", pwError);
    return NextResponse.redirect(
      new URL(`/auth/signup?error=${pwError}`, req.url)
    );
  }

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

  console.log("[signupAction] Prøver signUp...");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  console.log("[signupAction] signUp result:", { data, error });

  if (error) {
    console.log("[signupAction] SIGNUP ERROR:", error);
    return NextResponse.redirect(
      new URL("/auth/signup?error=supabase", req.url)
    );
  }

  if (!data.user) {
    console.log("[signupAction] Ingen user i signUp-resultatet");
    return NextResponse.redirect(
      new URL("/auth/signup?error=nouser", req.url)
    );
  }

  console.log("[signupAction] Oppretter profil...");

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: data.user.id,
      username,
    });

  console.log("[signupAction] Profile insert error:", profileError);

  // Etter signUp må vi logge inn manuelt for å få token
  console.log("[signupAction] Prøver signInWithPassword...");

  const { data: loginData, error: loginError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  console.log("[signupAction] loginData:", loginData);
  console.log("[signupAction] loginError:", loginError);

  if (loginError || !loginData.session) {
    console.log("[signupAction] LOGIN FAILED");
    return NextResponse.redirect(
      new URL("/auth/login?error=1", req.url)
    );
  }

  console.log("[signupAction] LOGIN SUCCESS");
  console.log("=== signupAction END ===");

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
