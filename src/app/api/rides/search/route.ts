import { route, ok, body } from "@/lib/api";
import { query } from "@/lib/db";
import { searchRideSchema } from "@/lib/validation";
import { haversineKm } from "@/lib/geo";

// Ride matching: same org + published + seats + date window, then rank by how
// close the ride's origin/dest are to the searcher's (haversine).
const RADIUS_KM = 7;

interface RideRow {
  id: string;
  origin_label: string;
  origin_lat: number;
  origin_lng: number;
  dest_label: string;
  dest_lat: number;
  dest_lng: number;
  route_geometry: string | null;
  distance_km: number;
  duration_min: number;
  depart_at: Date;
  seats_available: number;
  fare_per_seat: number;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_model: string;
  registration_number: string;
}

export const POST = route(async (req, { user }) => {
  const s = await body(req, searchRideSchema);

  // Day window around the requested date (lenient so same-day rides match).
  const day = new Date(
    Date.UTC(s.departDate.getUTCFullYear(), s.departDate.getUTCMonth(), s.departDate.getUTCDate()),
  );
  const start = day;
  const end = new Date(day.getTime() + 48 * 3600 * 1000);

  const { rows } = await query<RideRow>(
    `SELECT r.id, r.origin_label, r.origin_lat, r.origin_lng,
            r.dest_label, r.dest_lat, r.dest_lng, r.route_geometry,
            r.distance_km, r.duration_min, r.depart_at, r.seats_available, r.fare_per_seat,
            u.name driver_name, u.phone driver_phone,
            v.model vehicle_model, v.registration_number
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.organization_id = $1
        AND r.status = 'published'
        AND r.seats_available >= $2
        AND r.driver_id <> $3
        AND r.depart_at >= $4 AND r.depart_at < $5
      ORDER BY r.depart_at ASC
      LIMIT 100`,
    [user.organizationId, s.seats, user.id, start.toISOString(), end.toISOString()],
  );

  const matched = rows
    .map((r) => {
      const originDist = haversineKm(s.origin, { lat: r.origin_lat, lng: r.origin_lng });
      const destDist = haversineKm(s.dest, { lat: r.dest_lat, lng: r.dest_lng });
      return { r, originDist, destDist, score: originDist + destDist };
    })
    .filter((m) => m.originDist <= RADIUS_KM && m.destDist <= RADIUS_KM)
    .sort((a, b) => a.score - b.score)
    .map(({ r, originDist, destDist }) => ({
      id: r.id,
      originLabel: r.origin_label,
      destLabel: r.dest_label,
      route: r.route_geometry ? (JSON.parse(r.route_geometry) as [number, number][]) : [],
      distanceKm: Number(r.distance_km),
      durationMin: Number(r.duration_min),
      departAt: r.depart_at,
      seatsAvailable: r.seats_available,
      farePerSeat: Number(r.fare_per_seat),
      driverName: r.driver_name,
      driverPhone: r.driver_phone,
      vehicle: `${r.vehicle_model} · ${r.registration_number}`,
      originDetourKm: Number(originDist.toFixed(1)),
      destDetourKm: Number(destDist.toFixed(1)),
    }));

  return ok(matched);
});
