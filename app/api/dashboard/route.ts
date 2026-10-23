import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMaxVessels } from "@/lib/vessels/limits";

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

  const { serviceRole } = supabaseServer();
  const [profileResult, karResult, sharesResult] = await Promise.all([
    serviceRole
      .from("profiles")
      .select("username, account_tier, batch_reminders_enabled")
      .eq("id", user.id)
      .maybeSingle(),
    serviceRole
      .from("kar")
      .select("id, nummer, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("kar_contributors")
      .select("kar_id")
      .eq("user_id", user.id),
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
  const ownedVesselIds = (karResult.data ?? []).map((vessel) => vessel.id);
  const { data: ownedContributors, error: ownedContributorsError } =
    ownedVesselIds.length > 0
      ? await serviceRole
          .from("kar_contributors")
          .select("kar_id")
          .in("kar_id", ownedVesselIds)
      : { data: [], error: null };
  if (ownedContributorsError) {
    return NextResponse.json(
      { error: ownedContributorsError.message },
      { status: 500 }
    );
  }
  if (sharesResult.error) {
    return NextResponse.json(
      { error: sharesResult.error.message },
      { status: 500 }
    );
  }

  const vessels = karResult.data ?? [];
  const ownedSharedIds = new Set(
    (ownedContributors ?? []).map((contributor) => contributor.kar_id)
  );
  const sharedIds = [
    ...new Set((sharesResult.data ?? []).map((share) => share.kar_id)),
  ];
  const { data: sharedVessels, error: sharedVesselsError } =
    sharedIds.length > 0
      ? await supabase
          .from("kar")
          .select("id, nummer, created_at, user_id")
          .in("id", sharedIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

  if (sharedVesselsError) {
    return NextResponse.json(
      { error: sharedVesselsError.message },
      { status: 500 }
    );
  }

  const allVessels = [...vessels, ...(sharedVessels ?? [])];
  const vesselIds = allVessels.map((vessel) => vessel.id);
  let batchByVessel = new Map<
    string,
    { id: string; status: string; name: string | null }
  >();

  if (vesselIds.length > 0) {
    const { data: batches, error: batchesError } = await supabase
      .from("batches")
      .select("id, aktivt_kar, status, name, startdato")
      .in("aktivt_kar", vesselIds)
      .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"])
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
          id: batch.id,
          status: batch.status,
          name: batch.name,
        });
      }
    }
  }

  const ownerIds = [
    ...new Set((sharedVessels ?? []).map((vessel) => vessel.user_id)),
  ];
  const { data: owners, error: ownersError } =
    ownerIds.length > 0
      ? await serviceRole
          .from("profiles")
          .select("id, username")
          .in("id", ownerIds)
      : { data: [], error: null };

  if (ownersError) {
    return NextResponse.json(
      { error: ownersError.message },
      { status: 500 }
    );
  }
  const ownerNames = new Map((owners ?? []).map((owner) => [owner.id, owner.username]));

  const activeBatchIds = [
    ...new Set([...batchByVessel.values()].map((batch) => batch.id)),
  ];
  const [readingsResult, remindersResult] = await Promise.all([
    activeBatchIds.length > 0
      ? serviceRole
          .from("sg_readings")
          .select("batch_id, sg, created_at")
          .in("batch_id", activeBatchIds)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    activeBatchIds.length > 0 &&
    profileResult.data?.batch_reminders_enabled !== false
      ? serviceRole
          .from("batch_reminders")
          .select("batch_id, type, message, remind_at")
          .eq("user_id", user.id)
          .in("batch_id", activeBatchIds)
          .is("read_at", null)
          .order("remind_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (readingsResult.error) {
    return NextResponse.json(
      { error: readingsResult.error.message },
      { status: 500 }
    );
  }
  if (remindersResult.error) {
    return NextResponse.json(
      { error: remindersResult.error.message },
      { status: 500 }
    );
  }

  const latestReadingByBatch = new Map<
    string,
    { sg: number | string; created_at: string }
  >();
  for (const reading of readingsResult.data ?? []) {
    if (reading.batch_id && !latestReadingByBatch.has(reading.batch_id)) {
      latestReadingByBatch.set(reading.batch_id, {
        sg: reading.sg,
        created_at: reading.created_at,
      });
    }
  }

  const nextReminderByBatch = new Map<
    string,
    { type: "manual" | "sg_check"; message: string; remind_at: string }
  >();
  for (const reminder of remindersResult.data ?? []) {
    if (reminder.batch_id && !nextReminderByBatch.has(reminder.batch_id)) {
      nextReminderByBatch.set(reminder.batch_id, {
        type: reminder.type,
        message: reminder.message,
        remind_at: reminder.remind_at,
      });
    }
  }

  return NextResponse.json(
    {
      username: profileResult.data?.username ?? "Unknown",
      maxVessels: getMaxVessels(profileResult.data?.account_tier),
      kar: vessels.map((vessel, index) => {
        const batch = batchByVessel.get(vessel.id);
        return {
          id: vessel.id,
          nummer: index + 1,
          created_at: vessel.created_at,
          status:
            batch?.status === "Conditioning"
              ? "Conditioning"
              : batch?.status === "Sekundær" || batch?.status === "secondary"
                ? "Sekundær"
                : batch
                  ? "Aktiv"
                  : "Ledig",
          batchName: batch?.name ?? null,
          activeBatchId: batch?.id ?? null,
          latestReading: batch
            ? latestReadingByBatch.get(batch.id) ?? null
            : null,
          nextReminder: batch
            ? nextReminderByBatch.get(batch.id) ?? null
            : null,
          isShared: ownedSharedIds.has(vessel.id),
        };
      }),
      sharedKar: (sharedVessels ?? []).map((vessel) => {
        const batch = batchByVessel.get(vessel.id);
        return {
          id: vessel.id,
          nummer: vessel.nummer,
          created_at: vessel.created_at,
          status:
            batch?.status === "Conditioning"
              ? "Conditioning"
              : batch?.status === "Sekundær" || batch?.status === "secondary"
                ? "Sekundær"
                : batch
                  ? "Aktiv"
                  : "Ledig",
          batchName: batch?.name ?? null,
          activeBatchId: batch?.id ?? null,
          latestReading: batch
            ? latestReadingByBatch.get(batch.id) ?? null
            : null,
          nextReminder: batch
            ? nextReminderByBatch.get(batch.id) ?? null
            : null,
          ownerUsername: ownerNames.get(vessel.user_id) ?? "Another user",
          isShared: true,
        };
      }),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
