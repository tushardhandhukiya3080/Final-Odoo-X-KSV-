import { route, ok, body, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { offerRideSchema } from "@/lib/validation";
import { routeVia } from "@/lib/geo";
import { publish } from "@/lib/events";

// Publish (offer) a ride. Route geometry/distance/ETA are computed server-side.
export const POST = route(async (req, { user }) => {
  const d = await body(req, offerRideSchema);

  const veh = await query<{ seating_capacity: number }>(
    "SELECT seating_capacity FROM vehicles WHERE id=$1 AND user_id=$2 AND is_active=true",
    [d.vehicleId, user.id],
  );
  if (!veh.rows[0]) throw new ApiError("Select one of your registered vehicles", 404);
  if (d.seats > veh.rows[0].seating_capacity) {
    throw new ApiError(`Seats can't exceed vehicle capacity (${veh.rows[0].seating_capacity})`, 400);
  }

  // Route through any intermediate stops: [origin, ...stops, dest].
  const stops = d.trackMode === "manual" ? d.stops : [];
  const r = await routeVia([d.origin, ...stops, d.dest]);

  const { rows } = await query<{ id: string }>(
    `INSERT INTO rides
       (driver_id, vehicle_id, organization_id,
        origin_label, origin_lat, origin_lng,
        dest_label, dest_lat, dest_lng,
        route_geometry, distance_km, duration_min,
        depart_at, seats_total, seats_available, fare_per_seat,
        is_recurring, recur_days, stops, track_mode)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15,$16,$17,$18,$19)
     RETURNING id`,
    [
      user.id, d.vehicleId, user.organizationId,
      d.origin.label, d.origin.lat, d.origin.lng,
      d.dest.label, d.dest.lat, d.dest.lng,
      JSON.stringify(r.coordinates), r.distanceKm, r.durationMin,
      d.departAt, d.seats, d.farePerSeat,
      d.isRecurring, d.recurDays ?? null,
      JSON.stringify(stops), d.trackMode,
    ],
  );

  publish("ride.published", {
    rideId: rows[0].id,
    from: d.origin.label,
    to: d.dest.label,
  });

  return ok({ id: rows[0].id, distanceKm: r.distanceKm, durationMin: r.durationMin }, 201);
});
