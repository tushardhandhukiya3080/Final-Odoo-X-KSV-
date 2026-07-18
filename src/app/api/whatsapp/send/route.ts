import { NextResponse } from "next/server";
import { z } from "zod";
import { sendWhatsApp } from "@/lib/whatsapp";
import { getSession } from "@/lib/auth";
import { isSameOrigin } from "@/lib/origin";
import { rateLimit } from "@/lib/ratelimit";
import { publish } from "@/lib/events";

const schema = z.object({
  to: z
    .string()
    .trim()
    .min(6, "Recipient phone required (E.164, e.g. +14155551234)")
    .max(30),
  message: z.string().trim().min(1, "Message is required").max(1000),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  // Auth required — never an open WhatsApp relay.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`whatsapp:${session.userId}`, 10, 60_000).ok) {
    return NextResponse.json({ error: "Too many messages. Slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await sendWhatsApp(parsed.data.to, parsed.data.message);
  if (!result.ok) {
    publish("whatsapp.failed", { to: parsed.data.to });
    // 503 = we're not set up yet; 502 = provider rejected it
    return NextResponse.json(result, { status: result.configured ? 502 : 503 });
  }

  publish("whatsapp.sent", { to: parsed.data.to, sid: result.sid });
  return NextResponse.json(result);
}
