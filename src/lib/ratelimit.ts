// ponytail: in-process fixed-window limiter. Single instance only — swap for
// Redis (@upstash/ratelimit) if you scale out. IP-based keys derived from
// X-Forwarded-For are spoofable without a trusted proxy, so callers should ALSO
// limit by a non-spoofable identifier (e.g. the target email) for auth routes.
type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();
let lastSweep = 0;

// Drop expired keys so the Map can't grow unbounded under many distinct keys.
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k);
  }
}

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  sweep(now);
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) return { ok: false, remaining: 0 };

  entry.count += 1;
  return { ok: true, remaining: limit - entry.count };
}
