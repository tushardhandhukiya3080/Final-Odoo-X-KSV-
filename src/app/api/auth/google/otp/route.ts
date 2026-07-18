import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { onboardOtpSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { isSameOrigin } from "@/lib/origin";
import { verifyPendingToken } from "@/lib/google";
import { createChallenge } from "@/lib/otp";
import { sendWhatsApp } from "@/lib/whatsapp";

// Google onboarding, step 1: WhatsApp a code to the phone the user just entered.
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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (
    !rateLimit(`gonboard-otp:ip:${ip}`, 10, 60_000).ok ||
    !rateLimit(`gonboard-otp:email:${pending.email}`, 3, 60_000).ok
  ) {
    return NextResponse.json({ error: "Please wait before requesting another code." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = onboardOtpSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  if (pending.needsCompany && !parsed.data.companyName) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const code = createChallenge(pending.email, parsed.data.phone);
  const result = await sendWhatsApp(
    parsed.data.phone,
    `Your RideShare verification code is ${code}. It expires in 5 minutes.`,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ sent: true });
}
