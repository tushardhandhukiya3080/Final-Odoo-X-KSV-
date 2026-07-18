import { route, ok, body } from "@/lib/api";
import { query } from "@/lib/db";
import { placeSchema } from "@/lib/validation";

interface Place {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export const GET = route(async (_req, { user }) => {
  const { rows } = await query<Place>(
    "SELECT id, label, address, lat, lng FROM saved_places WHERE user_id=$1 ORDER BY created_at",
    [user.id],
  );
  return ok(rows);
});

export const POST = route(async (req, { user }) => {
  const p = await body(req, placeSchema);
  const { rows } = await query<Place>(
    `INSERT INTO saved_places (user_id, label, address, lat, lng)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, label, address, lat, lng`,
    [user.id, p.label, p.address, p.lat, p.lng],
  );
  return ok(rows[0], 201);
});
