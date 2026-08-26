export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  

  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  

  // Passordvalidering
  function validatePassword(pw: string) {
    if (pw.length < 8) return "too_short";
    if (!/[A-Z]/.test(pw)) return "no_uppercase";
    return null;
  }

  const pwError = validatePassword(password);
  if (pwError) {
    
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

 

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  

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

  

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: data.user.id,
      username,
    });

 

  // Etter signUp må vi logge inn manuelt for å få token
  

  const { data: loginData, error: loginError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  

  if (loginError || !loginData.session) {
    console.log("[signupAction] LOGIN FAILED");
    return NextResponse.redirect(
      new URL("/auth/login?error=1", req.url)
    );
  }

  

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
