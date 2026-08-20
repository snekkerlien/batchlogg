export const runtime = "edge";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("loginAction: START");

  const { supabase } = createRouteHandlerClient();
  const form = await req.formData();

  const username = form.get("username") as string;
  const password = form.get("password") as string;
  const email = `${username}@example.com`;

  console.log("loginAction: username =", username);
  console.log("loginAction: email =", email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("loginAction: supabase response =", { data, error });

  if (error) {
    console.log("loginAction: LOGIN FAILED");
    return NextResponse.redirect("/auth/login?error=1");
  }

  console.log("loginAction: LOGIN SUCCESS");
  return NextResponse.redirect("/dashboard");
}
