import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/loginAction",
  "/auth/signupAction",
  "/auth/logout",
];

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

  // Hvis siden er beskyttet, la AuthProvider håndtere auth
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Alt annet → tillat
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
