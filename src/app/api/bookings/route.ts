import { pool } from "@/lib/db";
import { route, ok, body, ApiError } from "@/lib/api";
import { bookingSchema } from "@/lib/validation";
import { publish } from "@/lib/events";

// Book a seat. Seat availability is decremented under a row lock so two
// passengers can't claim the same last seat.
export const POST = route(async (req, { user }) => {
  const b = await body(req, bookingSchema);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      driver_id: string;
      organization_id: string;
      status: string;
      seats_available: number;
      fare_per_seat: string;
      origin_label: string;
      origin_lat: number;
      origin_lng: number;
      dest_label: string;
      dest_lat: number;
      dest_lng: number;
    }>("SELECT * FROM rides WHERE id=$1 FOR UPDATE", [b.rideId]);
    const ride = rows[0];

    if (!ride) throw new ApiError("Ride not found", 404);
    if (ride.organization_id !== user.organizationId) throw new ApiError("Forbidden", 403);
    if (ride.driver_id === user.id) throw new ApiError("You can't book your own ride", 400);
    // Allow boarding a ride that's published or already en-route (mid-route pickup),
    // but not one that's completed or cancelled.
    if (!["published", "started", "in_progress"].includes(ride.status)) {
      throw new ApiError("This ride is no longer open for booking", 400);
    }
    if (ride.seats_available < b.seats) throw new ApiError("Not enough seats available", 400);

    const fare = b.seats * Number(ride.fare_per_seat);
    const pickup = b.pickup ?? {
      label: ride.origin_label,
      lat: ride.origin_lat,
      lng: ride.origin_lng,
    };
    const drop = b.drop ?? { label: ride.dest_label, lat: ride.dest_lat, lng: ride.dest_lng };

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO bookings
         (ride_id, passenger_id, seats, pickup_label, pickup_lat, pickup_lng,
          drop_label, drop_lat, drop_lng, fare_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [b.rideId, user.id, b.seats, pickup.label, pickup.lat, pickup.lng, drop.label, drop.lat, drop.lng, fare],
    );

    await client.query("UPDATE rides SET seats_available = seats_available - $1 WHERE id=$2", [
      b.seats,
      b.rideId,
    ]);
    await client.query("COMMIT");

    publish("ride.booked", { rideId: b.rideId, passenger: user.name });
    return ok({ id: inserted.rows[0].id, fareAmount: fare }, 201);
  } catch (err) {
    await client.query("ROLLBACK");
    if ((err as { code?: string }).code === "23505") {
      throw new ApiError("You've already booked this ride", 409);
    }
    throw err;
  } finally {
    client.release();
  }
});
