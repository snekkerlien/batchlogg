export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("=== /kar/create START ===");

  // Opprett supabase-server-klient (viktig!)
  const supabase = supabaseServer();

  // Hent JWT-token fra Authorization-header
  const authHeader = req.headers.get("Authorization");
  console.log("[/kar/create] Authorization header:", authHeader);

  // Hent bruker fra Supabase (via cookies + token)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[/kar/create] User:", user);
  console.log("[/kar/create] UserError:", userError);

  if (!user) {
    console.log("[/kar/create] Ingen bruker → 401");
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // Finn eksisterende kar
  console.log("[/kar/create] Henter eksisterende kar for bruker:", user.id);

  const { data: existing, error: existingError } = await supabase
    .from("kar")
    .select("nummer")
    .eq("user_id", user.id)
    .order("nummer", { ascending: false })
    .limit(1);

  console.log("[/kar/create] Existing kar:", existing);
  console.log("[/kar/create] ExistingError:", existingError);

  // Beregn neste nummer
  const nextNummer = existing?.[0]?.nummer + 1 || 1;
  console.log("[/kar/create] Neste nummer:", nextNummer);

  // Opprett nytt kar
  console.log("[/kar/create] Oppretter nytt kar...");

  const { data, error } = await supabase
    .from("kar")
    .insert({
      user_id: user.id,
      nummer: nextNummer,
    })
    .select()
    .single();

  console.log("[/kar/create] Insert result:", data);
  console.log("[/kar/create] Insert error:", error);

  if (error) {
    console.log("[/kar/create] FEIL VED INSERT:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[/kar/create] SUCCESS → returnerer nytt kar");
  console.log("=== /kar/create END ===");

  return NextResponse.json({ success: true, kar: data });
}
