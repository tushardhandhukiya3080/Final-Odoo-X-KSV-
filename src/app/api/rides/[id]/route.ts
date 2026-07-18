import { route, ok, ApiError } from "@/lib/api";
import { query } from "@/lib/db";

interface RideDetail {
  id: string;
  driver_id: string;
  organization_id: string;
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
  seats_total: number;
  seats_available: number;
  fare_per_seat: number;
  status: string;
  last_lat: number | null;
  last_lng: number | null;
  last_ping_at: Date | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_model: string;
  registration_number: string;
  seating_capacity: number;
}

export const GET = route(async (_req, { user, params }) => {
  const { rows } = await query<RideDetail>(
    `SELECT r.*, u.name driver_name, u.phone driver_phone,
            v.model vehicle_model, v.registration_number, v.seating_capacity
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.id = $1`,
    [params.id],
  );
  const r = rows[0];
  if (!r) throw new ApiError("Ride not found", 404);
  if (r.organization_id !== user.organizationId) throw new ApiError("Forbidden", 403);

  const passengers = await query<{
    booking_id: string;
    passenger_id: string;
    name: string | null;
    phone: string | null;
    seats: number;
    pickup_label: string;
    status: string;
    payment_status: string;
    fare_amount: number;
  }>(
    `SELECT b.id booking_id, b.passenger_id, u.name, u.phone, b.seats,
            b.pickup_label, b.status, b.payment_status, b.fare_amount
       FROM bookings b JOIN users u ON u.id = b.passenger_id
      WHERE b.ride_id = $1 AND b.status <> 'cancelled'
      ORDER BY b.created_at`,
    [params.id],
  );

  const isDriver = r.driver_id === user.id;
  const myBooking = passengers.rows.find((p) => p.passenger_id === user.id) ?? null;

  return ok({
    ride: {
      id: r.id,
      originLabel: r.origin_label,
      origin: { lat: r.origin_lat, lng: r.origin_lng },
      destLabel: r.dest_label,
      dest: { lat: r.dest_lat, lng: r.dest_lng },
      route: r.route_geometry ? (JSON.parse(r.route_geometry) as [number, number][]) : [],
      distanceKm: Number(r.distance_km),
      durationMin: Number(r.duration_min),
      departAt: r.depart_at,
      seatsTotal: r.seats_total,
      seatsAvailable: r.seats_available,
      farePerSeat: Number(r.fare_per_seat),
      status: r.status,
      live: r.last_lat != null && r.last_lng != null ? { lat: r.last_lat, lng: r.last_lng } : null,
      lastPingAt: r.last_ping_at,
    },
    driver: { id: r.driver_id, name: r.driver_name, phone: r.driver_phone },
    vehicle: {
      model: r.vehicle_model,
      registrationNumber: r.registration_number,
      seatingCapacity: r.seating_capacity,
    },
    passengers: passengers.rows.map((p) => ({
      bookingId: p.booking_id,
      passengerId: p.passenger_id,
      name: p.name,
      phone: p.phone,
      seats: p.seats,
      pickupLabel: p.pickup_label,
      status: p.status,
      paymentStatus: p.payment_status,
      fareAmount: Number(p.fare_amount),
    })),
    isDriver,
    myBooking: myBooking
      ? {
          bookingId: myBooking.booking_id,
          status: myBooking.status,
          paymentStatus: myBooking.payment_status,
          fareAmount: Number(myBooking.fare_amount),
        }
      : null,
  });
});
