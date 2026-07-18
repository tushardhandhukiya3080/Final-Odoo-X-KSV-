import { route, ok, body, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { orgUpdateSchema } from "@/lib/validation";
import type { Organization } from "@/lib/types";

const SELECT = `SELECT id, name, domain, currency, fuel_price_per_litre,
                       default_fare_per_km, cost_per_km
                  FROM organizations WHERE id=$1`;

export const GET = route(async (_req, { user }) => {
  const { rows } = await query<Organization>(SELECT, [user.organizationId]);
  return ok(rows[0] ?? null);
});

export const PATCH = route(
  async (req, { user }) => {
    const d = await body(req, orgUpdateSchema);
    const { rows } = await query<Organization>(
      `UPDATE organizations SET
         name = COALESCE($2, name),
         currency = COALESCE($3, currency),
         fuel_price_per_litre = COALESCE($4, fuel_price_per_litre),
         default_fare_per_km = COALESCE($5, default_fare_per_km),
         cost_per_km = COALESCE($6, cost_per_km)
       WHERE id=$1
       RETURNING id, name, domain, currency, fuel_price_per_litre, default_fare_per_km, cost_per_km`,
      [
        user.organizationId,
        d.name ?? null,
        d.currency ?? null,
        d.fuelPricePerLitre ?? null,
        d.defaultFarePerKm ?? null,
        d.costPerKm ?? null,
      ],
    );
    if (!rows[0]) throw new ApiError("Organization not found", 404);
    return ok(rows[0]);
  },
  { admin: true },
);
