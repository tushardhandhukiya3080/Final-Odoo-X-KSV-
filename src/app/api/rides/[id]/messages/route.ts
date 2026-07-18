import { route, ok, body, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { messageSchema } from "@/lib/validation";
import { publish } from "@/lib/events";

// Chat is limited to trip participants: the driver and non-cancelled passengers.
async function assertParticipant(rideId: string, userId: string): Promise<void> {
  const { rows } = await query(
    `SELECT 1 FROM rides r
      WHERE r.id = $1 AND (
        r.driver_id = $2
        OR EXISTS (SELECT 1 FROM bookings b
                    WHERE b.ride_id = r.id AND b.passenger_id = $2 AND b.status <> 'cancelled'))`,
    [rideId, userId],
  );
  if (!rows[0]) throw new ApiError("You're not a participant of this ride", 403);
}

export const GET = route(async (_req, { user, params }) => {
  await assertParticipant(params.id, user.id);
  const { rows } = await query<{
    id: string;
    sender_id: string;
    name: string | null;
    body: string;
    created_at: Date;
  }>(
    `SELECT m.id, m.sender_id, u.name, m.body, m.created_at
       FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.ride_id = $1 ORDER BY m.created_at ASC LIMIT 200`,
    [params.id],
  );
  return ok(
    rows.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.name ?? "Someone",
      body: m.body,
      at: m.created_at,
      mine: m.sender_id === user.id,
    })),
  );
});

export const POST = route(async (req, { user, params }) => {
  await assertParticipant(params.id, user.id);
  const { body: text } = await body(req, messageSchema);
  const { rows } = await query<{ id: string; created_at: Date }>(
    "INSERT INTO messages (ride_id, sender_id, body) VALUES ($1,$2,$3) RETURNING id, created_at",
    [params.id, user.id, text],
  );
  publish("chat.message", {
    rideId: params.id,
    senderId: user.id,
    senderName: user.name ?? "Someone",
    body: text,
    at: rows[0].created_at,
  });
  return ok({ id: rows[0].id }, 201);
});
