import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface CurrentUserRestriction {
  restriction_type: "mute" | "ban";
  ends_at: string | null;
  reason: string | null;
  actor_is_admin: boolean;
}

export async function middleware(request: NextRequest) {
  if (!WRITE_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  const communityWrite =
    request.nextUrl.pathname.startsWith("/api/community/") ||
    request.nextUrl.pathname.startsWith("/community/");
  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return response;

  const { data, error: restrictionError } = await supabase.rpc(
    "current_user_restrictions"
  );
  if (restrictionError) {
    console.error("Could not check user restrictions", restrictionError);
    return NextResponse.json(
      { error: "Could not verify account restrictions. Please try again." },
      { status: 503 }
    );
  }

  const activeRestrictions = (data ?? []) as CurrentUserRestriction[];
  if (activeRestrictions.some((restriction) => restriction.actor_is_admin)) {
    return response;
  }

  const ban = activeRestrictions.find(
    (restriction) => restriction.restriction_type === "ban"
  );
  if (ban) {
    return NextResponse.json(
      {
        error: "Your account is banned from making changes.",
        restriction: "ban",
        endsAt: ban.ends_at,
      },
      { status: 403 }
    );
  }

  if (communityWrite) {
    const mute = activeRestrictions.find(
      (restriction) => restriction.restriction_type === "mute"
    );
    if (mute) {
      return NextResponse.json(
        {
          error: "Your account is muted from community actions.",
          restriction: "mute",
          endsAt: mute.ends_at,
        },
        { status: 403 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/:path*"],
};
