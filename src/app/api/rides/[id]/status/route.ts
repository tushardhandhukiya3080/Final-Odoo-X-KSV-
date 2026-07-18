import { route, ok, body, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { rideStatusSchema } from "@/lib/validation";
import { publish } from "@/lib/events";

// Driver-only trip lifecycle transitions.
const ALLOWED: Record<string, string[]> = {
  published: ["started", "cancelled"],
  started: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed"],
};

export const POST = route(async (req, { user, params }) => {
  const { status } = await body(req, rideStatusSchema);

  const { rows } = await query<{ status: string; driver_id: string }>(
    "SELECT status, driver_id FROM rides WHERE id=$1",
    [params.id],
  );
  const ride = rows[0];
  if (!ride) throw new ApiError("Ride not found", 404);
  if (ride.driver_id !== user.id) throw new ApiError("Only the driver can update this trip", 403);
  if (!ALLOWED[ride.status]?.includes(status)) {
    throw new ApiError(`Cannot move a ${ride.status} ride to ${status}`, 400);
  }

  await query("UPDATE rides SET status=$1 WHERE id=$2", [status, params.id]);

  if (status === "completed") {
    // Passengers can now pay; keep payment pending until they settle.
    await query(
      "UPDATE bookings SET status='completed' WHERE ride_id=$1 AND status='booked'",
      [params.id],
    );
  }
  if (status === "cancelled") {
    await query(
      "UPDATE bookings SET status='cancelled' WHERE ride_id=$1 AND status='booked'",
      [params.id],
    );
  }

  const evt =
    status === "started"
      ? "trip.started"
      : status === "completed"
        ? "trip.completed"
        : status === "cancelled"
          ? "ride.cancelled"
          : "trip.progress";
  publish(evt, { rideId: params.id });

  return ok({ status });
});
