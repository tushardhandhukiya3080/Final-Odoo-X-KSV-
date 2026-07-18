import { NextResponse } from "next/server";
import { publish } from "@/lib/events";

// n8n calls this back (HTTP Request node -> http://host.docker.internal:3000/api/automation/callback)
// so a finished workflow shows up instantly on the live feed.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const event = publish("automation.callback", body);
  return NextResponse.json({ ok: true, event });
}
