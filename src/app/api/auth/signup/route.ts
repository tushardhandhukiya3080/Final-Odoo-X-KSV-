import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";
import { signupVerifySchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { isSameOrigin } from "@/lib/origin";
import { publish } from "@/lib/events";
import { verifyChallenge } from "@/lib/otp";

// Signup also onboards the organization: the first person to name a company
// creates it and becomes its admin; everyone after joins as an employee.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`signup:ip:${ip}`, 10, 60_000).ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = signupVerifySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, email, password, companyName, otp } = parsed.data;

  // Verify the WhatsApp code before creating anything. Use the phone the code
  // was actually sent to (not the resubmitted one) so the stored number is the
  // verified one.
  const check = verifyChallenge(email, otp);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }
  const phone = check.phone;
  const passwordHash = await hashPassword(password);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Find-or-create the org atomically (unique index on lower(name)).
    const created = await client.query<{ id: string }>(
      `INSERT INTO organizations (name) VALUES ($1)
       ON CONFLICT (lower(name)) DO NOTHING RETURNING id`,
      [companyName],
    );
    let organizationId: string;
    let role: "admin" | "employee";
    if (created.rows[0]) {
      organizationId = created.rows[0].id;
      role = "admin";
    } else {
      const existing = await client.query<{ id: string }>(
        "SELECT id FROM organizations WHERE lower(name) = lower($1)",
        [companyName],
      );
      organizationId = existing.rows[0].id;
      role = "employee";
    }

    const result = await client.query<{ id: string; email: string }>(
      `INSERT INTO users (email, password_hash, name, phone, organization_id, role)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email`,
      [email, passwordHash, name, phone || null, organizationId, role],
    );
    await client.query("COMMIT");

    const user = result.rows[0];
    await setSession({ userId: user.id, email: user.email, role, organizationId });
    publish("employee.joined", { name, role, organizationId });

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name, role } },
      { status: 201 },
    );
  } catch (err) {
    await client.query("ROLLBACK");
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    console.error("signup error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  } finally {
    client.release();
  }
}
