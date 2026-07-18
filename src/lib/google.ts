// Google OAuth (OpenID Connect, authorization-code flow). No SDK: we build the
// consent URL, exchange the code over fetch, and verify the returned id_token's
// signature against Google's JWKS with jose (already a dependency).
//
// The "pending" token is a short-lived signed JWT that carries the verified
// Google identity between the callback and the /onboard step (where the user
// supplies a phone + company and verifies via WhatsApp OTP). It is NOT a session.
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const encoder = new TextEncoder();
function jwtSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error("JWT_SECRET is missing or too short (min 16 chars).");
  return encoder.encode(s);
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function config(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured.");
  return { clientId, clientSecret };
}

// The OAuth redirect URI. Prefer a fixed APP_URL (set behind a proxy so an
// untrusted Host header can't influence it); fall back to the request origin
// for zero-config local dev. Must exactly match a URI registered with Google.
export function callbackUrl(requestOrigin: string): string {
  const base = (process.env.APP_URL || requestOrigin).replace(/\/$/, "");
  return `${base}/api/auth/google/callback`;
}

export function buildAuthUrl(redirectUri: string, state: string, nonce: string): string {
  const { clientId } = config();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Exchange the auth code for tokens; returns the raw id_token. */
export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const { clientId, clientSecret } = config();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("No id_token in Google response");
  return data.id_token;
}

export type GoogleClaims = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  phone?: string;
};

/** Verify signature, issuer, audience, expiry, and the nonce we set at start. */
export async function verifyIdToken(idToken: string, expectedNonce: string): Promise<GoogleClaims> {
  const { clientId } = config();
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ISSUERS,
    audience: clientId,
  });
  if (payload.nonce !== expectedNonce) throw new Error("Google nonce mismatch");
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  return {
    sub: String(payload.sub ?? ""),
    email: typeof payload.email === "string" ? payload.email : "",
    emailVerified,
    name: typeof payload.name === "string" ? payload.name : null,
    phone: typeof payload.phone_number === "string" ? payload.phone_number : undefined,
  };
}

// ── Pending onboarding token (post-Google, pre-account) ──────────────────────
export type PendingData = {
  email: string;
  name: string | null;
  sub: string;
  userId?: string; // set when a user row already exists for this email
  needsCompany: boolean; // true when the user has no organization yet
  googlePhone?: string; // phone claim from Google, if any (usually absent)
};

export async function createPendingToken(data: PendingData): Promise<string> {
  return new SignJWT({ ...data, kind: "g_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(jwtSecret());
}

export async function verifyPendingToken(token: string): Promise<PendingData | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    if (payload.kind !== "g_pending" || typeof payload.email !== "string") return null;
    return {
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : null,
      sub: typeof payload.sub === "string" ? payload.sub : "",
      userId: typeof payload.userId === "string" ? payload.userId : undefined,
      needsCompany: payload.needsCompany === true,
      googlePhone: typeof payload.googlePhone === "string" ? payload.googlePhone : undefined,
    };
  } catch {
    return null;
  }
}
