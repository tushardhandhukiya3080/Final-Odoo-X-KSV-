import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";

// Everything under the app shell requires a session.
const PROTECTED = [
  "/dashboard",
  "/find",
  "/offer",
  "/trips",
  "/vehicles",
  "/wallet",
  "/history",
  "/reports",
  "/places",
  "/settings",
  "/admin",
];
const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;
  const { pathname } = req.nextUrl;

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Admin console is role-gated.
  if (pathname.startsWith("/admin") && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/find/:path*",
    "/offer/:path*",
    "/trips/:path*",
    "/vehicles/:path*",
    "/wallet/:path*",
    "/history/:path*",
    "/reports/:path*",
    "/places/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
