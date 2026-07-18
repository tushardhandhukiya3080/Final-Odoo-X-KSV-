// CSRF guard for state-changing POST routes. Browsers send an Origin header on
// cross-site POSTs (including form posts), so rejecting a mismatched Origin
// stops login/logout CSRF. A missing Origin (curl, server-to-server) can't be
// a browser CSRF, so it's allowed.
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
