import { route, ok, body, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { vehicleSchema } from "@/lib/validation";
import type { Vehicle } from "@/lib/types";

export const PATCH = route(async (req, { user, params }) => {
  const v = await body(req, vehicleSchema);
  const { rows } = await query<Vehicle>(
    `UPDATE vehicles SET model=$1, registration_number=$2, seating_capacity=$3,
            fuel_type=$4, mileage_kmpl=$5
       WHERE id=$6 AND user_id=$7
     RETURNING id, user_id, model, registration_number, seating_capacity, fuel_type, mileage_kmpl, is_active`,
    [v.model, v.registrationNumber, v.seatingCapacity, v.fuelType, v.mileageKmpl, params.id, user.id],
  );
  if (!rows[0]) throw new ApiError("Vehicle not found", 404);
  return ok(rows[0]);
});

export const DELETE = route(async (_req, { user, params }) => {
  try {
    const { rowCount } = await query(
      "DELETE FROM vehicles WHERE id=$1 AND user_id=$2",
      [params.id, user.id],
    );
    if (!rowCount) throw new ApiError("Vehicle not found", 404);
    return ok({ deleted: true });
  } catch (err) {
    // FK violation: the vehicle is referenced by a ride — deactivate instead.
    if ((err as { code?: string }).code === "23503") {
      await query("UPDATE vehicles SET is_active=false WHERE id=$1 AND user_id=$2", [
        params.id,
        user.id,
      ]);
      return ok({ deleted: false, deactivated: true });
    }
    throw err;
  }
});
