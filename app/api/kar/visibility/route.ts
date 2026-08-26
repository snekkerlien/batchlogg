import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const id = formData.get("id") as string;
    const is_public_raw = formData.get("is_public");
    const is_public = is_public_raw === "true";

    if (!id) {
      return NextResponse.json(
        { error: "Missing vessel ID" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const { supabase } = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check ownership
    const { data: kar } = await supabase
      .from("kar")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!kar) {
      return NextResponse.json(
        { error: "Vessel not found" },
        { status: 404 }
      );
    }

    if (kar.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not allowed to modify this vessel" },
        { status: 403 }
      );
    }

    // Update visibility
    const { error } = await supabase
      .from("kar")
      .update({ is_public })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update visibility" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
      is_public,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
