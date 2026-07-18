// Shared domain types (mirror db/carpool.sql rows). camelCase in TS; the db
// layer maps snake_case columns to these where a row is returned to callers.

export type Role = "employee" | "admin";
export type RideStatus =
  | "published"
  | "started"
  | "in_progress"
  | "completed"
  | "cancelled";
export type BookingStatus = "booked" | "cancelled" | "completed";
export type PaymentStatus = "pending" | "completed";
export type PaymentMethod = "cash" | "card" | "upi" | "wallet";
export type FuelType = "petrol" | "diesel" | "cng" | "ev";
export type VehicleType = "bike" | "car";

export interface Organization {
  id: string;
  name: string;
  domain: string | null;
  currency: string;
  fuel_price_per_litre: number;
  default_fare_per_km: number;
  cost_per_km: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  organizationId: string;
  phone: string | null;
  walletBalance: number;
}

export interface Vehicle {
  id: string;
  user_id: string;
  model: string;
  registration_number: string;
  vehicle_type: VehicleType;
  seating_capacity: number;
  fuel_type: FuelType;
  mileage_kmpl: number;
  is_active: boolean;
  plate_verified: boolean;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  /** [lng, lat] pairs as returned by OSRM geojson. */
  coordinates: [number, number][];
}
