import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyPendingToken } from "@/lib/google";

// The /onboard page reads this to know who's signing in and whether it needs to
// ask for a company. Returns 401 if there's no valid pending Google identity.
export async function GET() {
  const jar = await cookies();
  const token = jar.get("g_pending")?.value;
  const pending = token ? await verifyPendingToken(token) : null;
  if (!pending) return NextResponse.json({ pending: null }, { status: 401 });

  return NextResponse.json({
    pending: {
      email: pending.email,
      name: pending.name,
      needsCompany: pending.needsCompany,
      googlePhone: pending.googlePhone ?? null,
    },
  });
}
