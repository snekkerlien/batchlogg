export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { syncUserVesselLimit } from "@/lib/vessels/limits";

export async function POST(req: Request) {
  const { supabase, serviceRole } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    await syncUserVesselLimit(serviceRole, user.id);
  } catch (error) {
    console.error("Could not synchronize vessel limit", error);
    return NextResponse.json(
      { error: "Could not verify vessel limit" },
      { status: 500 }
    );
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
    return NextResponse.redirect(
      new URL("/dashboard?error=vessel-limit", req.url)
    );
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
