import { NextResponse } from "next/server";
import { z } from "zod";
import { sendWhatsApp } from "@/lib/whatsapp";
import { formatInvoice } from "@/lib/invoice";
import { getSession } from "@/lib/auth";
import { isSameOrigin } from "@/lib/origin";
import { rateLimit } from "@/lib/ratelimit";
import { publish } from "@/lib/events";

const schema = z.object({
  to: z.string().trim().min(6, "Recipient phone required (E.164)").max(30),
  customerName: z.string().trim().max(100).optional(),
  invoiceNo: z.string().trim().max(40).optional(),
  currency: z.string().trim().max(5).optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Item name required").max(120),
        qty: z.number().positive("qty must be > 0"),
        price: z.number().nonnegative("price must be >= 0"),
      }),
    )
    .min(1, "At least one item is required"),
  notes: z.string().trim().max(500).optional(),
  mediaUrl: z.string().url("mediaUrl must be a public URL").optional(),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

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

  const { to, mediaUrl, ...invoice } = parsed.data;
  const message = formatInvoice(invoice);
  const result = await sendWhatsApp(to, message, mediaUrl);

  // Return the formatted `message` either way so you can preview/log what was sent.
  if (!result.ok) {
    publish("invoice.failed", { to });
    return NextResponse.json(
      { ...result, message },
      { status: result.configured ? 502 : 503 },
    );
  }
  publish("invoice.sent", { to, sid: result.sid });
  return NextResponse.json({ ...result, message });
}
