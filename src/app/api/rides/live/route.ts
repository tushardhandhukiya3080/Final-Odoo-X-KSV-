import { route, ok } from "@/lib/api";
import { query } from "@/lib/db";

// Every active ride in the org on one live map — where each driver is now and
// whether they still have free seats. Includes your own ride (flagged isMine).
interface Row {
  id: string;
  origin_label: string;
  dest_label: string;
  status: string;
  track_mode: string;
  seats_total: number;
  seats_available: number;
  lat: number;
  lng: number;
  driver_id: string;
  driver_name: string | null;
  vehicle_model: string;
  registration_number: string;
  vehicle_type: string;
}

export const GET = route(async (_req, { user }) => {
  const { rows } = await query<Row>(
    `SELECT r.id, r.origin_label, r.dest_label, r.status, r.track_mode,
            r.seats_total, r.seats_available,
            COALESCE(r.last_lat, r.origin_lat) AS lat,
            COALESCE(r.last_lng, r.origin_lng) AS lng,
            r.driver_id, u.name driver_name,
            v.model vehicle_model, v.registration_number, v.vehicle_type
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.organization_id = $1
        AND r.status IN ('published','started','in_progress')
      ORDER BY r.depart_at ASC
      LIMIT 200`,
    [user.organizationId],
  );

  return ok(
    rows.map((r) => ({
      id: r.id,
      driverName: r.driver_name,
      vehicle: `${r.vehicle_model} · ${r.registration_number}`,
      vehicleType: r.vehicle_type === "bike" ? "bike" : "car",
      from: r.origin_label.split(",")[0],
      to: r.dest_label.split(",")[0],
      status: r.status,
      trackMode: r.track_mode,
      seatsTotal: r.seats_total,
      seatsAvailable: r.seats_available,
      free: r.seats_available > 0,
      isMine: r.driver_id === user.id,
      lat: Number(r.lat),
      lng: Number(r.lng),
    })),
  );
});
