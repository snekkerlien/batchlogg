import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid signup request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid signup request." }, { status: 400 });
  }

  if (!("email" in body) || !("password" in body) || !("username" in body)) {
    return NextResponse.json({ error: "Please provide valid signup details." }, { status: 400 });
  }

  const { email, password, username } = body;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof username !== "string" ||
    !email.trim() ||
    !password ||
    !username.trim() ||
    username.trim().length > 64
  ) {
    return NextResponse.json({ error: "Please provide valid signup details." }, { status: 400 });
  }

  const debug = process.env.SIGNUP_DEBUG === "true";
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim();
  const safeMessage = (message: string) =>
    message
      .replaceAll(normalizedEmail, "[email]")
      .replaceAll(password, "[password]")
      .replaceAll(username.trim(), "[username]");

  if (debug) {
    console.info("[signup-debug] Starting Supabase client setup.");
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or anonymous key is not configured.");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (debug) {
      console.info("[signup-debug] Supabase Auth signup request started.");
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { username: normalizedUsername },
      },
    });

    if (error || !data.user) {
      if (debug) {
        const message = safeMessage(error?.message ?? "Supabase returned no user.");
        console.error("[signup-debug] Supabase Auth signup failed.", {
          name: error?.name ?? null,
          message,
          status: error?.status ?? null,
          code: error?.code ?? null,
        });
      }
      return NextResponse.json(
        { error: error?.message ?? "Could not create account." },
        { status: error?.status ?? 400 }
      );
    }

    if (debug) {
      console.info("[signup-debug] Supabase Auth signup succeeded.", {
        userReturned: true,
        confirmationRequired: !data.session,
      });
    }

    return NextResponse.json({ userId: data.user.id });
  } catch (error) {
    const message =
      error instanceof Error ? safeMessage(error.message) : "Unknown signup server error.";
    console.error("[signup-debug] Signup endpoint failed unexpectedly.", {
      message,
      debugEnabled: debug,
    });
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    return NextResponse.json(
      { error: "Could not start signup. Check the server log for details." },
      { status: 500 }
    );
  }
}
