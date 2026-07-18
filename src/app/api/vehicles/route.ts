import { route, ok, body, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { vehicleSchema } from "@/lib/validation";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import type { Vehicle } from "@/lib/types";

export const GET = route(async (_req, { user }) => {
  const { rows } = await query<Vehicle>(
    `SELECT id, user_id, model, registration_number, vehicle_type, seating_capacity,
            fuel_type, mileage_kmpl, is_active, plate_verified
       FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC`,
    [user.id],
  );
  return ok(rows);
});

export const POST = route(async (req, { user }) => {
  const v = await body(req, vehicleSchema);
  const reg = normalizePlate(v.registrationNumber) || v.registrationNumber.trim().toUpperCase();

  // "Already registered?" — reject a plate any colleague in the org already has.
  const dup = await query<{ id: string }>(
    `SELECT v.id FROM vehicles v JOIN users u ON u.id = v.user_id
      WHERE u.organization_id = $1
        AND upper(replace(replace(v.registration_number, ' ', ''), '-', '')) = $2`,
    [user.organizationId, reg],
  );
  if (dup.rows[0]) throw new ApiError("This number plate is already registered", 409);

  // Only trust "verified" if the scanned plate is a real Indian plate format.
  const verified = v.plateVerified && isValidPlate(reg);

  const { rows } = await query<Vehicle>(
    `INSERT INTO vehicles
       (user_id, model, registration_number, vehicle_type, seating_capacity,
        fuel_type, mileage_kmpl, plate_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id, model, registration_number, vehicle_type, seating_capacity,
               fuel_type, mileage_kmpl, is_active, plate_verified`,
    [user.id, v.model, reg, v.vehicleType, v.seatingCapacity, v.fuelType, v.mileageKmpl, verified],
  );
  return ok(rows[0], 201);
});
