import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  hasPermission,
  normalizeMembershipRole,
} from "@/lib/auth/permissions";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const BAN_APPEAL_PATH = "/api/account/ban-appeal";
const AUTH_CALLBACK_PATH = "/api/auth/callback";

interface CurrentUserRestriction {
  restriction_type: "mute" | "ban";
  ends_at: string | null;
  reason: string | null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isWrite = WRITE_METHODS.has(request.method);
  const isPageRequest = request.method === "GET";
  const isStaticAsset =
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.[^/]+$/.test(pathname);
  if ((!isWrite && !isPageRequest) || isStaticAsset) {
    return NextResponse.next();
  }

  const communityWrite =
    isWrite &&
    (pathname.startsWith("/api/community/") ||
      pathname === "/api/recipes/fork" ||
      pathname.startsWith("/community/"));
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
  } = await supabase.auth.getUser();
  if (!user) return response;

  const serviceRole = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const now = new Date().toISOString();
  const { data, error: restrictionError } = await serviceRole
    .from("user_restrictions")
    .select("restriction_type, ends_at, reason")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);
  if (restrictionError) {
    console.error("Could not check user restrictions", restrictionError);
    const unavailable = NextResponse.json(
      { error: "Could not verify account restrictions. Please try again." },
      { status: 503 }
    );
    response.cookies.getAll().forEach((cookie) => unavailable.cookies.set(cookie));
    return unavailable;
  }

  const activeRestrictions = (data ?? []) as CurrentUserRestriction[];
  if (activeRestrictions.length > 0) {
    const { data: profile, error: profileError } = await serviceRole
      .from("profiles")
      .select("membership_status")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Could not check account permissions for restriction", profileError);
      const unavailable = NextResponse.json(
        { error: "Could not verify account permissions. Please try again." },
        { status: 503 }
      );
      response.cookies.getAll().forEach((cookie) => unavailable.cookies.set(cookie));
      return unavailable;
    }
    const role = normalizeMembershipRole(profile?.membership_status);
    if (hasPermission(role, "manage_users")) return response;
  }

  const ban = activeRestrictions.find(
    (restriction) => restriction.restriction_type === "ban"
  );
  if (ban) {
    if (
      pathname === "/banned" ||
      pathname === "/logout" ||
      pathname === AUTH_CALLBACK_PATH ||
      (pathname === BAN_APPEAL_PATH && request.method === "POST")
    ) {
      return response;
    }

    const blocked = pathname.startsWith("/api/")
      ? NextResponse.json(
          {
            error: "Your account is banned.",
            restriction: "ban",
            endsAt: ban.ends_at,
          },
          { status: 403 }
        )
      : NextResponse.redirect(new URL("/banned", request.url));
    response.cookies.getAll().forEach((cookie) => blocked.cookies.set(cookie));
    return blocked;
  }

  if (communityWrite) {
    const mute = activeRestrictions.find(
      (restriction) => restriction.restriction_type === "mute"
    );
    if (mute) {
      const blocked = NextResponse.json(
        {
          error: "Your account is muted from community actions.",
          restriction: "mute",
          endsAt: mute.ends_at,
        },
        { status: 403 }
      );
      response.cookies.getAll().forEach((cookie) => blocked.cookies.set(cookie));
      return blocked;
    }
  }

  return response;
}

export const config = {
  matcher: ["/:path*"],
};
