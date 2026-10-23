import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 128;

function getRouteCategory(pathname: unknown): string | null {
  if (typeof pathname !== "string" || pathname.length > 300 || !pathname.startsWith("/")) {
    return null;
  }
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) return "";
  const category = firstSegment.toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(category) ? `/${category}` : "/other";
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
  }

  const event = body as { type?: unknown; pathname?: unknown };
  if (event.type !== "page_view" && event.type !== "sign_in") {
    return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
  }
  const route = event.type === "page_view"
    ? getRouteCategory(event.pathname)
    : "";
  if (route === null) {
    return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
  }

  const { supabase, serviceRole } = supabaseServer();
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (authorization && !bearerToken) {
    return NextResponse.json({ error: "Invalid analytics authorization." }, { status: 401 });
  }
  const {
    data: { user },
    error: authError,
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();
  if (bearerToken && (authError || !user)) {
    return NextResponse.json({ error: "Invalid analytics authorization." }, { status: 401 });
  }
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Could not verify analytics session", authError);
    return NextResponse.json({ error: "Could not verify analytics session." }, { status: 503 });
  }
  if (event.type === "sign_in" && !user) {
    return NextResponse.json({ error: "Sign-in analytics requires an authenticated session." }, { status: 401 });
  }

  const { error } = await serviceRole.rpc("record_analytics_event", {
    p_event_type: event.type,
    p_route: route,
  });
  if (error) {
    console.error("Could not record analytics event", error);
    return NextResponse.json({ error: "Could not record analytics event." }, { status: 500 });
  }

  if (user) {
    const { error: activityError } = await serviceRole.rpc(
      "record_analytics_user_activity",
      { p_user_id: user.id }
    );
    if (activityError) {
      console.error("Could not record account activity analytics", activityError);
      return NextResponse.json(
        { error: "Could not record account activity." },
        { status: 500 }
      );
    }
  }

  return new NextResponse(null, { status: 204 });
}
