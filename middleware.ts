import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Sider som krever innlogging
const protectedRoutes = [
  "/dashboard",
  "/kar",
  "/account",
];

// Sider som skal være åpne (viktig for login/signup)
const publicRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/loginAction",
  "/auth/signupAction",
  "/auth/logout",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Tillat alle public routes (login, signup, actions)
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Sjekk om siden er beskyttet
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Sjekk Supabase session-cookie
  const supabaseSession = req.cookies.get("sb-access-token");

  // Ingen session → redirect til login
  if (!supabaseSession) {
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Session finnes → tillat tilgang
  return NextResponse.next();
}

// Middleware skal kjøre på auth-ruter også (for whitelist)
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/kar/:path*",
    "/account/:path*",
    "/auth/:path*",
  ],
};
