import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { isSameOrigin } from "@/lib/origin";
import { createChallenge } from "@/lib/otp";
import { sendWhatsApp } from "@/lib/whatsapp";

// Step 1 of signup: validate the details and WhatsApp a 6-digit code to the
// phone. The account is only created once the code is verified (see signup).
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`signup-otp:ip:${ip}`, 10, 60_000).ok) {
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

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email, phone } = parsed.data;

  // Per-email throttle so a single address can't fan out WhatsApp messages.
  if (!rateLimit(`signup-otp:email:${email}`, 3, 60_000).ok) {
    return NextResponse.json(
      { error: "Please wait before requesting another code." },
      { status: 429 },
    );
  }

  // Don't spend a message on an already-registered email (signup would 409).
  const existing = await pool.query("SELECT 1 FROM users WHERE email = $1", [email]);
  if (existing.rowCount) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const code = createChallenge(email, phone);
  const result = await sendWhatsApp(
    phone,
    `Your RideShare verification code is ${code}. It expires in 5 minutes.`,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ sent: true }, { status: 200 });
}
