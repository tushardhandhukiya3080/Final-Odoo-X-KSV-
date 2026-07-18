// Node-runtime auth helpers: password hashing + session cookie management.
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { query } from "./db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createToken,
  verifyToken,
  type SessionPayload,
} from "./session";
import type { CurrentUser } from "./types";

const SALT_ROUNDS = 10;

// Compare against this when the email doesn't exist so login takes the same
// time whether or not the account is real (blocks timing-based enumeration).
export const DUMMY_PASSWORD_HASH =
  "$2a$10$jGWUSoRW1icWj8a14vp9BOjwvDM3WJTKoCgnhpjk9wZxEJDm4YPgq";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const token = await createToken(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Full, fresh user row (wallet balance, name, phone) — hits the DB, so use in
// route handlers / server components, not in edge middleware.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  const { rows } = await query<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    organization_id: string | null;
    phone: string | null;
    wallet_balance: string;
  }>(
    `SELECT id, email, name, role, organization_id, phone, wallet_balance
     FROM users WHERE id = $1`,
    [session.userId],
  );
  const u = rows[0];
  if (!u || !u.organization_id) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role === "admin" ? "admin" : "employee",
    organizationId: u.organization_id,
    phone: u.phone,
    walletBalance: Number(u.wallet_balance),
  };
}

export type { SessionPayload };
