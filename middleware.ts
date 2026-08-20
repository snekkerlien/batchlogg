import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Sider som krever innlogging
const protectedRoutes = [
  "/dashboard",
  "/kar",
  "/account",
];

// Sider som skal være åpne (login, signup, actions)
const publicRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/loginAction",
  "/auth/signupAction",
  "/auth/logout",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Tillat alle public routes
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

  // Supabase SSR bruker disse cookie-navnene:
  const accessToken = req.cookies.get("sb-access-token")?.value;
  const refreshToken = req.cookies.get("sb-refresh-token")?.value;

  // Ingen session → redirect til login
  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Session finnes → tillat tilgang
  return NextResponse.next();
}

// Middleware skal kjøre på ALLE ruter
export const config = {
  matcher: ["/:path*"],
};
