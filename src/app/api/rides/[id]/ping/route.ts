import { route, ok, body, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { pingSchema } from "@/lib/validation";
import { publish } from "@/lib/events";

// Driver pushes their live location during an active trip → broadcast via SSE.
export const POST = route(async (req, { user, params }) => {
  const { lat, lng } = await body(req, pingSchema);

  const { rows } = await query<{ status: string; driver_id: string }>(
    "SELECT status, driver_id FROM rides WHERE id=$1",
    [params.id],
  );
  const ride = rows[0];
  if (!ride) throw new ApiError("Ride not found", 404);
  if (ride.driver_id !== user.id) throw new ApiError("Only the driver can share location", 403);
  if (ride.status !== "started" && ride.status !== "in_progress") {
    throw new ApiError("Tracking is only active during a live trip", 400);
  }

  await query("UPDATE rides SET last_lat=$1, last_lng=$2, last_ping_at=now() WHERE id=$3", [
    lat,
    lng,
    params.id,
  ]);
  publish("trip.location", { rideId: params.id, lat, lng });

  return ok({ ok: true });
});
