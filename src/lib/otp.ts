// Short-lived OTP challenges for signup phone (WhatsApp) verification.
// ponytail: in-process Map, single-instance only — same constraint as
// ratelimit.ts and the WhatsApp socket. Swap for Redis with a TTL if you
// scale out to more than one node.
import { randomInt } from "node:crypto";

const TTL_MS = 5 * 60_000; // code valid for 5 minutes
const MAX_ATTEMPTS = 5; // wrong guesses before the code is burned

type Challenge = { code: string; phone: string; expiresAt: number; attempts: number };

// Pin on globalThis so Next dev hot-reloads don't wipe pending challenges.
const g = globalThis as unknown as { __otp?: Map<string, Challenge> };
const store: Map<string, Challenge> = g.__otp ?? (g.__otp = new Map());

let lastSweep = 0;
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of store) {
    if (now > v.expiresAt) store.delete(k);
  }
}

/** Generate a 6-digit code for `email`, bound to `phone`, and store it. */
export function createChallenge(email: string, phone: string): string {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  store.set(email, { code, phone, expiresAt: Date.now() + TTL_MS, attempts: 0 });
  return code;
}

export type VerifyResult = { ok: true; phone: string } | { ok: false; error: string };

/** Verify `code` for `email`. Single-use: a correct code is consumed. */
export function verifyChallenge(email: string, code: string): VerifyResult {
  const now = Date.now();
  sweep(now);
  const c = store.get(email);
  if (!c || now > c.expiresAt) {
    store.delete(email);
    return { ok: false, error: "Code expired. Request a new one." };
  }
  if (c.attempts >= MAX_ATTEMPTS) {
    store.delete(email);
    return { ok: false, error: "Too many attempts. Request a new code." };
  }
  c.attempts += 1;
  if (c.code !== code) return { ok: false, error: "Incorrect code." };
  store.delete(email); // consume on success
  return { ok: true, phone: c.phone };
}
