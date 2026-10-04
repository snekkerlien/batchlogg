import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError) {
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status === 401 ? 401 : 500 }
    );
  }

  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const [profileResult, karResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, max_vessels")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("kar")
      .select("id, nummer, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (profileResult.error) {
    return NextResponse.json(
      { error: profileResult.error.message },
      { status: 500 }
    );
  }

  if (karResult.error) {
    return NextResponse.json(
      { error: karResult.error.message },
      { status: 500 }
    );
  }

  const vessels = karResult.data ?? [];
  const vesselIds = vessels.map((vessel) => vessel.id);
  let batchByVessel = new Map<string, { status: string; name: string | null }>();

  if (vesselIds.length > 0) {
    const { data: batches, error: batchesError } = await supabase
      .from("batches")
      .select("aktivt_kar, status, name, startdato")
      .in("aktivt_kar", vesselIds)
      .in("status", ["Aktiv", "Sekundær", "secondary"])
      .order("startdato", { ascending: false });

    if (batchesError) {
      return NextResponse.json(
        { error: batchesError.message },
        { status: 500 }
      );
    }

    batchByVessel = new Map();
    for (const batch of batches ?? []) {
      if (batch.aktivt_kar && !batchByVessel.has(batch.aktivt_kar)) {
        batchByVessel.set(batch.aktivt_kar, {
          status: batch.status,
          name: batch.name,
        });
      }
    }
  }

  return NextResponse.json(
    {
      username: profileResult.data?.username ?? "Unknown",
      maxVessels: profileResult.data?.max_vessels ?? 12,
      kar: vessels.map((vessel, index) => {
        const batch = batchByVessel.get(vessel.id);
        return {
          id: vessel.id,
          nummer: index + 1,
          created_at: vessel.created_at,
          status:
            batch?.status === "Sekundær" || batch?.status === "secondary"
              ? "Sekundær"
              : batch
                ? "Aktiv"
                : "Ledig",
          batchName: batch?.name ?? null,
        };
      }),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
