import { route, ok, body, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { progressSchema } from "@/lib/validation";
import { waypointsOf, type Stop } from "@/lib/rides";
import { publish } from "@/lib/events";

// Manual tracking: the driver marks reaching the next stop along the route.
// Advancing also drops a location "ping" at that stop so riders see it move.
export const POST = route(async (req, { user, params }) => {
  const { action } = await body(req, progressSchema);

  const { rows } = await query<{
    driver_id: string;
    status: string;
    stops: Stop[] | null;
    progress_index: number;
    origin_label: string;
    origin_lat: number;
    origin_lng: number;
    dest_label: string;
    dest_lat: number;
    dest_lng: number;
  }>(
    `SELECT driver_id, status, stops, progress_index,
            origin_label, origin_lat, origin_lng, dest_label, dest_lat, dest_lng
       FROM rides WHERE id = $1`,
    [params.id],
  );
  const ride = rows[0];
  if (!ride) throw new ApiError("Ride not found", 404);
  if (ride.driver_id !== user.id) throw new ApiError("Only the driver can update progress", 403);
  if (ride.status !== "started" && ride.status !== "in_progress") {
    throw new ApiError("Start the trip before updating stop progress", 400);
  }

  const origin: Stop = { label: ride.origin_label, lat: ride.origin_lat, lng: ride.origin_lng };
  const dest: Stop = { label: ride.dest_label, lat: ride.dest_lat, lng: ride.dest_lng };
  const stops = Array.isArray(ride.stops) ? ride.stops : [];
  const waypoints = waypointsOf(origin, stops, dest);
  const last = waypoints.length - 1;

  const idx =
    action === "reset" ? 0 : Math.min(ride.progress_index + 1, last);
  const wp = waypoints[idx];

  await query(
    "UPDATE rides SET progress_index=$1, last_lat=$2, last_lng=$3, last_ping_at=now() WHERE id=$4",
    [idx, wp.lat, wp.lng, params.id],
  );
  publish("trip.progress", { rideId: params.id, index: idx, label: wp.label, lat: wp.lat, lng: wp.lng });

  return ok({ progressIndex: idx, reachedLabel: wp.label, arrived: idx >= last });
});
