import { z } from "zod";
import { route, ok, body, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { publish } from "@/lib/events";

const sosSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// Emergency SOS — broadcasts an alert (with live location) to everyone on the
// trip and the org's live feed. Any participant can trigger it.
export const POST = route(async (req, { user, params }) => {
  const { lat, lng } = await body(req, sosSchema);

  const { rows } = await query(
    `SELECT 1 FROM rides r
      WHERE r.id=$1 AND (r.driver_id=$2
        OR EXISTS (SELECT 1 FROM bookings b WHERE b.ride_id=r.id AND b.passenger_id=$2 AND b.status<>'cancelled'))`,
    [params.id, user.id],
  );
  if (!rows[0]) throw new ApiError("You're not on this trip", 403);

  publish("sos", {
    rideId: params.id,
    from: user.name ?? user.email,
    lat,
    lng,
    message: `🆘 SOS from ${user.name ?? "a rider"} — check the trip`,
  });
  return ok({ raised: true });
});
