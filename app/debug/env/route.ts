export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "NOT LOADED",
    ANON: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "NOT LOADED",
    URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "NOT LOADED",
  });
}
