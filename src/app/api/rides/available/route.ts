import { route, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { isArrived, waypointsOf, type Stop } from "@/lib/rides";

// Browse public rides in the org that are still catchable — published or already
// en-route but not yet arrived. Shows where each ride is going and where it is now.
interface Row {
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
  status: string;
  stops: Stop[] | null;
  track_mode: string;
  progress_index: number;
  last_lat: number | null;
  last_lng: number | null;
  driver_name: string | null;
  vehicle_model: string;
  registration_number: string;
}

export const GET = route(async (_req, { user }) => {
  const { rows } = await query<Row>(
    `SELECT r.id, r.origin_label, r.origin_lat, r.origin_lng,
            r.dest_label, r.dest_lat, r.dest_lng, r.route_geometry,
            r.distance_km, r.duration_min, r.depart_at, r.seats_available, r.fare_per_seat,
            r.status, r.stops, r.track_mode, r.progress_index, r.last_lat, r.last_lng,
            u.name driver_name, v.model vehicle_model, v.registration_number
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.organization_id = $1
        AND r.driver_id <> $2
        AND r.seats_available >= 1
        AND r.status IN ('published','started','in_progress')
      ORDER BY r.depart_at ASC
      LIMIT 100`,
    [user.organizationId, user.id],
  );

  const list = rows
    .map((r) => {
      const origin: Stop = { label: r.origin_label, lat: r.origin_lat, lng: r.origin_lng };
      const dest: Stop = { label: r.dest_label, lat: r.dest_lat, lng: r.dest_lng };
      const stops = Array.isArray(r.stops) ? r.stops : [];
      const waypoints = waypointsOf(origin, stops, dest);
      const progressIndex = Math.min(r.progress_index, waypoints.length - 1);
      const last = r.last_lat != null && r.last_lng != null ? { lat: r.last_lat, lng: r.last_lng } : null;
      const arrived = isArrived({ mode: r.track_mode, progressIndex, waypointCount: waypoints.length, last, dest });

      // Where the ride is now: the last reached stop (manual) or the GPS ping.
      const currentLabel =
        r.track_mode === "gps"
          ? last
            ? "Live GPS position"
            : "Not started yet"
          : waypoints[progressIndex].label;

      return {
        arrived,
        id: r.id,
        originLabel: r.origin_label,
        destLabel: r.dest_label,
        stops: waypoints.map((w, i) => ({
          label: w.label,
          reached: i <= progressIndex,
          isOrigin: i === 0,
          isDest: i === waypoints.length - 1,
        })),
        route: r.route_geometry ? (JSON.parse(r.route_geometry) as [number, number][]) : [],
        distanceKm: Number(r.distance_km),
        durationMin: Number(r.duration_min),
        departAt: r.depart_at,
        seatsAvailable: r.seats_available,
        farePerSeat: Number(r.fare_per_seat),
        status: r.status,
        trackMode: r.track_mode,
        progressIndex,
        currentLabel,
        live: last,
        driverName: r.driver_name,
        vehicle: `${r.vehicle_model} · ${r.registration_number}`,
      };
    })
    .filter((r) => !r.arrived);

  return ok(list);
});
