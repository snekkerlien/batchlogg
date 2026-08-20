import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Sider som skal være åpne
const publicRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/loginAction",
  "/auth/signupAction",
  "/auth/logout",
];

// Sider som krever innlogging
const protectedRoutes = [
  "/dashboard",
  "/kar",
  "/account",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Tillat public routes
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

  // Supabase SSR cookies (Edge-kompatibelt)
  const access = req.cookies.get("sb-access-token")?.value;
  const refresh = req.cookies.get("sb-refresh-token")?.value;

  // Ingen session → redirect
  if (!access || !refresh) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Session finnes → tillat tilgang
  return NextResponse.next();
}

// Middleware skal kjøre på alle ruter
export const config = {
  matcher: ["/:path*"],
};
