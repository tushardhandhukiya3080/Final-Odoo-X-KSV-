import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { googleConfigured, buildAuthUrl, callbackUrl } from "@/lib/google";

// Kick off Google sign-in: mint state + nonce (CSRF + replay protection), stash
// them in short-lived cookies, and redirect to Google's consent screen.
export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_disabled", req.nextUrl.origin));
  }

  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");
  const redirectUri = callbackUrl(req.nextUrl.origin);

  const res = NextResponse.redirect(buildAuthUrl(redirectUri, state, nonce));
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, // survives the top-level redirect back from Google
    path: "/",
    maxAge: 600, // 10 minutes to complete the consent
  };
  res.cookies.set("g_state", state, opts);
  res.cookies.set("g_nonce", nonce, opts);
  return res;
}
