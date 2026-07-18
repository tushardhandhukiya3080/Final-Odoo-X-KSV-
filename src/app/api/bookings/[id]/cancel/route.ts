import { pool } from "@/lib/db";
import { route, ok, ApiError } from "@/lib/api";
import { publish } from "@/lib/events";

// Passenger cancels their booking; the seat is returned to the ride.
export const POST = route(async (_req, { user, params }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      ride_id: string;
      passenger_id: string;
      seats: number;
      status: string;
      ride_status: string;
    }>(
      `SELECT b.ride_id, b.passenger_id, b.seats, b.status, r.status ride_status
         FROM bookings b JOIN rides r ON r.id = b.ride_id
        WHERE b.id = $1 FOR UPDATE OF b`,
      [params.id],
    );
    const bk = rows[0];
    if (!bk) throw new ApiError("Booking not found", 404);
    if (bk.passenger_id !== user.id) throw new ApiError("Forbidden", 403);
    if (bk.status !== "booked") throw new ApiError("This booking can't be cancelled", 400);
    if (bk.ride_status !== "published") {
      throw new ApiError("The trip has already started — contact the driver", 400);
    }

    await client.query("UPDATE bookings SET status='cancelled' WHERE id=$1", [params.id]);
    await client.query("UPDATE rides SET seats_available = seats_available + $1 WHERE id=$2", [
      bk.seats,
      bk.ride_id,
    ]);
    await client.query("COMMIT");

    publish("ride.cancelled", { rideId: bk.ride_id });
    return ok({ cancelled: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
