import { NextResponse } from "next/server";
import { publish } from "@/lib/events";

// Fire an event onto the live stream. Handy for demos / manual testing.
export async function POST(req: Request) {
  let body: { type?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const event = publish(body.type ?? "message", body.data ?? {});
  return NextResponse.json({ ok: true, event });
}
