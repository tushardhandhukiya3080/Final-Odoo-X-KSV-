import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import type { Organization } from "@/lib/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const { rows } = await query<Organization>(
    `SELECT id, name, domain, currency, fuel_price_per_litre,
            default_fare_per_km, cost_per_km
     FROM organizations WHERE id = $1`,
    [user.organizationId],
  );

  return NextResponse.json({ user, organization: rows[0] ?? null });
}
