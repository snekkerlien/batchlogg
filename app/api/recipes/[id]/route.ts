import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

/* -----------------------------
   DELETE – slett oppskrift
----------------------------- */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const recipeId = params.id;
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
      .delete()
      .eq("id", recipeId)
      .select()
      .single();

    if (error) {
      console.error("DELETE recipe error:", error);
      return NextResponse.json(
        { error: "Kunne ikke slette oppskriften", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Oppskrift ikke funnet" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: data });
  } catch (err: any) {
    console.error("RECIPES DELETE ERROR:", err);
    return NextResponse.json(
      { error: "Serverfeil", details: err.message },
      { status: 500 }
    );
  }
}

/* -----------------------------
   PATCH – oppdater oppskrift
----------------------------- */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const recipeId = params.id;
    const cookieStore = cookies();
    const body = await req.json();

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

    // Body kan inneholde alle eller noen av disse:
    // name, ingredients, method, notes, og, fg, abv, volume, batch_id, is_public
    const updateData: any = {};

    for (const key of [
      "name",
      "ingredients",
      "method",
      "notes",
      "og",
      "fg",
      "abv",
      "volume",
      "batch_id",
      "is_public",
    ]) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    const { data, error } = await supabase
      .from("recipes")
      .update(updateData)
      .eq("id", recipeId)
      .select()
      .single();

    if (error) {
      console.error("UPDATE recipe error:", error);
      return NextResponse.json(
        { error: "Kunne ikke oppdatere oppskriften", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Oppskrift ikke funnet" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, updated: data });
  } catch (err: any) {
    console.error("RECIPES UPDATE ERROR:", err);
    return NextResponse.json(
      { error: "Serverfeil", details: err.message },
      { status: 500 }
    );
  }
}
