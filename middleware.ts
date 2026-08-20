import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Sider som krever innlogging
const protectedRoutes = [
  "/dashboard",
  "/kar",
  "/account",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Sjekk om brukeren prøver å gå til en beskyttet side
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    // Ikke beskytt auth-sider eller offentlige sider
    return NextResponse.next();
  }

  // Hent Supabase-session-cookie
  const supabaseSession = req.cookies.get("sb-access-token");

  // Hvis ingen session → redirect til login
  if (!supabaseSession) {
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Hvis session finnes → tillat tilgang
  return NextResponse.next();
}

// Middleware skal kjøre på alle ruter
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/kar/:path*",
    "/account/:path*",
  ],
};
