import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { batchId, sg } = await req.json();

  const { data, error } = await supabase
    .from("sg_readings")
    .insert({ batch_id: batchId, sg });

  if (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
