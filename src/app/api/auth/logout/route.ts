import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { isSameOrigin } from "@/lib/origin";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
