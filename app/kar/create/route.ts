export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { syncUserVesselLimit } from "@/lib/vessels/limits";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  const { supabase: cookieSupabase, serviceRole } = supabaseServer();
  const supabase = token
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: { Authorization: `Bearer ${token}` },
          },
        }
      )
    : cookieSupabase;

  const {
    data: { user },
    error: authError,
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
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
