import { route, ok, body } from "@/lib/api";
import { query } from "@/lib/db";
import { vehicleSchema } from "@/lib/validation";
import type { Vehicle } from "@/lib/types";

export const GET = route(async (_req, { user }) => {
  const { rows } = await query<Vehicle>(
    `SELECT id, user_id, model, registration_number, seating_capacity,
            fuel_type, mileage_kmpl, is_active
       FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC`,
    [user.id],
  );
  return ok(rows);
});

export const POST = route(async (req, { user }) => {
  const v = await body(req, vehicleSchema);
  const { rows } = await query<Vehicle>(
    `INSERT INTO vehicles
       (user_id, model, registration_number, seating_capacity, fuel_type, mileage_kmpl)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, model, registration_number, seating_capacity, fuel_type, mileage_kmpl, is_active`,
    [user.id, v.model, v.registrationNumber, v.seatingCapacity, v.fuelType, v.mileageKmpl],
  );
  return ok(rows[0], 201);
});
