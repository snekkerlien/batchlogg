export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST() {
  const { supabase } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("create_kar_with_limit");

  if (error) {
    console.error("Failed to create vessel", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    console.error("Vessel creation returned no result");
    return NextResponse.json(
      { error: "Vessel creation returned no result" },
      { status: 500 }
    );
  }

  if (!data.created) {
    return NextResponse.json(
      {
        error: `You have reached your limit of ${data.maxVessels} vessels.`,
        maxVessels: data.maxVessels,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, kar: data.kar });
}
