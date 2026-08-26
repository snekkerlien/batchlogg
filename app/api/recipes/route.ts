import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

/* -----------------------------
   POST – lagre ny oppskrift
----------------------------- */
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Ikke innlogget" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, ingredients, method, notes, volume } = body;

    const { data, error } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        name,
        ingredients,
        method,
        notes,
        volume: Number(volume), // ⭐ lagt til
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Kunne ikke lagre oppskriften", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, recipe: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Serverfeil", details: err.message },
      { status: 500 }
    );
  }
}

/* -----------------------------
   GET – hent alle oppskrifter
----------------------------- */
export async function GET() {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("SUPABASE INSERT ERROR:", error);
      return NextResponse.json(
        { error: "Kunne ikke hente oppskrifter", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ recipes: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Serverfeil", details: err.message },
      { status: 500 }
    );
  }
}
