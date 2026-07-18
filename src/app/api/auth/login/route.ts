import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, setSession, DUMMY_PASSWORD_HASH } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { isSameOrigin } from "@/lib/origin";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  // Throttle by IP (best-effort) AND by target email (not IP-spoofable), so
  // brute-forcing one account is capped even if the attacker rotates IPs.
  if (
    !rateLimit(`login:ip:${ip}`, 30, 60_000).ok ||
    !rateLimit(`login:email:${email}`, 10, 60_000).ok
  ) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  const result = await query<{
    id: string;
    email: string;
    password_hash: string;
    name: string | null;
    role: string;
    organization_id: string | null;
  }>(
    `SELECT id, email, password_hash, name, role, organization_id
     FROM users WHERE lower(email) = $1`,
    [email],
  );

  const user = result.rows[0];
  // Always run one bcrypt compare (dummy hash if no user) to equalize timing —
  // no account enumeration via response latency. Generic error either way.
  const passwordOk = await verifyPassword(
    password,
    user?.password_hash ?? DUMMY_PASSWORD_HASH,
  );
  if (!user || !passwordOk) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await setSession({
    userId: user.id,
    email: user.email,
    role: user.role === "admin" ? "admin" : "employee",
    organizationId: user.organization_id ?? "",
  });
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
