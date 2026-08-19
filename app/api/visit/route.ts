import { NextResponse } from "next/server";

export async function GET() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set("visited_dashboard", "true", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 år
  });

  return res;
}
