import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "./lib/supabase/supabaseServerFinal";

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

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Tillat public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return res;
  }

  // Sjekk om siden er beskyttet
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return res;
  }

  // Supabase Edge-middleware
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Ingen session → redirect
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Session finnes → tillat tilgang
  return res;
}

export const config = {
  matcher: ["/:path*"],
};
