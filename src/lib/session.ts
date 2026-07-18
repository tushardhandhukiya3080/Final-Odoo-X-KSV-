// Edge-safe session logic (jose only) — imported by middleware AND auth.ts.
// Keep this file free of Node-only imports (pg, bcryptjs, next/headers).
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./types";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  email: string;
  role: Role;
  organizationId: string;
};

const encoder = new TextEncoder();

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET is missing or too short (min 16 chars).");
  }
  return encoder.encode(s);
}

export async function createToken(payload: SessionPayload): Promise<string> {
  // `kind` discriminates a real session from other tokens signed with the same
  // JWT_SECRET (e.g. the Google onboarding "g_pending" token). Without it, a
  // pending token could be replayed as a session cookie. verifyToken() rejects
  // anything whose kind isn't "session".
  return new SignJWT({ ...payload, kind: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      payload.kind !== "session" ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role === "admin" ? "admin" : "employee",
      organizationId:
        typeof payload.organizationId === "string" ? payload.organizationId : "",
    };
  } catch {
    return null;
  }
}
