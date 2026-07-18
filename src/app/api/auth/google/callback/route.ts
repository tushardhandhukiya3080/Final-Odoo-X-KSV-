import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { createToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { exchangeCode, verifyIdToken, createPendingToken, callbackUrl } from "@/lib/google";

const SECURE = process.env.NODE_ENV === "production";

// Google redirects here with ?code&state. We verify state (CSRF), exchange the
// code, verify the id_token, then either log the user straight in (existing,
// fully-onboarded account) or hand off to /onboard to collect a phone/company.
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const errParam = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = req.cookies.get("g_state")?.value;
  const nonce = req.cookies.get("g_nonce")?.value;

  const fail = (reason = "google") => {
    const res = NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));
    res.cookies.delete("g_state");
    res.cookies.delete("g_nonce");
    return res;
  };

  // Reject anything that isn't a clean, state-matched, non-tampered callback.
  if (errParam || !code || !state || !stateCookie || state !== stateCookie || !nonce) {
    return fail();
  }

  let claims;
  try {
    const redirectUri = callbackUrl(url.origin);
    const idToken = await exchangeCode(code, redirectUri);
    claims = await verifyIdToken(idToken, nonce);
  } catch {
    return fail();
  }

  // Only trust a Google-verified email — this is what links to an existing row.
  if (!claims.email || !claims.emailVerified) return fail("google_unverified");
  const email = claims.email.toLowerCase();

  const { rows } = await query<{
    id: string;
    email: string;
    role: string;
    organization_id: string | null;
    phone: string | null;
  }>(
    `SELECT id, email, role, organization_id, phone FROM users WHERE lower(email) = $1`,
    [email],
  );
  const user = rows[0];

  // Fully-onboarded existing account → straight in.
  if (user && user.organization_id && user.phone) {
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role === "admin" ? "admin" : "employee",
      organizationId: user.organization_id,
    });
    const res = NextResponse.redirect(new URL("/dashboard", url.origin));
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    res.cookies.delete("g_state");
    res.cookies.delete("g_nonce");
    return res;
  }

  // Otherwise collect phone (+ company if new) at /onboard, verified via OTP.
  const pending = await createPendingToken({
    email,
    name: claims.name,
    sub: claims.sub,
    userId: user?.id,
    needsCompany: !user?.organization_id,
    googlePhone: claims.phone,
  });
  const res = NextResponse.redirect(new URL("/onboard", url.origin));
  res.cookies.set("g_pending", pending, {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 900, // 15 minutes, matches the token expiry
  });
  res.cookies.delete("g_state");
  res.cookies.delete("g_nonce");
  return res;
}
