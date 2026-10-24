import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import {
  FREE_RECIPE_LIMIT,
  getRecipeLimitStatus,
  recipeLimitError,
} from "@/lib/recipes/limits";

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

    const { serviceRole } = supabaseServer();
    const limitStatus = await getRecipeLimitStatus(serviceRole, user.id);
    if (!limitStatus.isPremium) {
      const limitError = recipeLimitError(limitStatus.count);
      if (limitError) {
        return NextResponse.json(
          { error: limitError, upgradeUrl: "/premium", recipeLimit: FREE_RECIPE_LIMIT, recipeCount: limitStatus.count },
          { status: 403 }
        );
      }
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
      if (error.code === "23514" && error.message.includes("Free accounts can save")) {
        return NextResponse.json(
          { error: error.message, upgradeUrl: "/premium", recipeLimit: FREE_RECIPE_LIMIT },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Kunne ikke lagre oppskriften", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, recipe: data });
  } catch (err: any) {
    console.error("Could not create recipe", err);
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
