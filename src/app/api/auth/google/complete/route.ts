import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { onboardCompleteSchema } from "@/lib/validation";
import { isSameOrigin } from "@/lib/origin";
import { rateLimit } from "@/lib/ratelimit";
import { verifyPendingToken } from "@/lib/google";
import { verifyChallenge } from "@/lib/otp";
import { publish } from "@/lib/events";

type Row = { id: string; email: string; role: string; organization_id: string | null };

// Google onboarding, step 2: verify the WhatsApp code, then create (or finish)
// the account and log the user in.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const jar = await cookies();
  const token = jar.get("g_pending")?.value;
  const pending = token ? await verifyPendingToken(token) : null;
  if (!pending) {
    return NextResponse.json({ error: "Session expired. Sign in with Google again." }, { status: 401 });
  }

  // Defense-in-depth: the OTP store already caps guesses per code, but cap the
  // endpoint too (mirrors /otp).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (
    !rateLimit(`gcomplete:ip:${ip}`, 20, 60_000).ok ||
    !rateLimit(`gcomplete:email:${pending.email}`, 10, 60_000).ok
  ) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = onboardCompleteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { companyName, otp } = parsed.data;
  if (pending.needsCompany && !companyName) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  // Verify the code and use the phone it was actually sent to.
  const check = verifyChallenge(pending.email, otp);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }
  const phone = check.phone;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Resolve the organization when the user needs one (first namer = admin).
    let newOrgId: string | null = null;
    let newRole: "admin" | "employee" = "employee";
    if (pending.needsCompany) {
      const created = await client.query<{ id: string }>(
        `INSERT INTO organizations (name) VALUES ($1)
         ON CONFLICT (lower(name)) DO NOTHING RETURNING id`,
        [companyName],
      );
      if (created.rows[0]) {
        newOrgId = created.rows[0].id;
        newRole = "admin";
      } else {
        const existing = await client.query<{ id: string }>(
          "SELECT id FROM organizations WHERE lower(name) = lower($1)",
          [companyName],
        );
        newOrgId = existing.rows[0].id;
        newRole = "employee";
      }
    }

    let row: Row;
    if (pending.userId) {
      // Existing account: attach the verified phone (and org, if it was missing).
      const res = pending.needsCompany
        ? await client.query<Row>(
            `UPDATE users SET phone = $1, organization_id = $2, role = $3
             WHERE id = $4 RETURNING id, email, role, organization_id`,
            [phone, newOrgId, newRole, pending.userId],
          )
        : await client.query<Row>(
            `UPDATE users SET phone = $1 WHERE id = $2
             RETURNING id, email, role, organization_id`,
            [phone, pending.userId],
          );
      row = res.rows[0];
    } else {
      // Brand-new Google user: no usable password (they sign in via Google), so
      // store a hash of an unguessable random value.
      const unusable = await hashPassword(randomBytes(24).toString("hex"));
      const res = await client.query<Row>(
        `INSERT INTO users (email, password_hash, name, phone, organization_id, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, role, organization_id`,
        [pending.email, unusable, pending.name, phone, newOrgId, newRole],
      );
      row = res.rows[0];
    }

    await client.query("COMMIT");

    if (!row.organization_id) {
      // Shouldn't happen (needsCompany covers it), but never mint a session
      // that getCurrentUser() would reject.
      return NextResponse.json({ error: "Could not resolve your organization." }, { status: 500 });
    }

    const role = row.role === "admin" ? "admin" : "employee";
    const sessionToken = await createToken({
      userId: row.id,
      email: row.email,
      role,
      organizationId: row.organization_id,
    });
    if (!pending.userId) publish("employee.joined", { name: pending.name, role, organizationId: row.organization_id });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    res.cookies.delete("g_pending");
    return res;
  } catch (err) {
    await client.query("ROLLBACK");
    if ((err as { code?: string }).code === "23505") {
      // Email got registered between callback and completion.
      return NextResponse.json(
        { error: "This email is already registered. Sign in with Google again." },
        { status: 409 },
      );
    }
    console.error("google complete error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  } finally {
    client.release();
  }
}
