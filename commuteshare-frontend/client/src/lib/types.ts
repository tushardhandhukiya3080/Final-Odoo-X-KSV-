export type Role = "COMPANY_ADMIN" | "EMPLOYEE";

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  profilePhoto: string | null;
}

export interface Org {
  id: string;
  name: string;
  domain: string;
  settings?: OrgSettings;
}

export interface OrgSettings {
  fuel_cost_per_litre: number;
  cost_per_km: number;
  currency: string;
  co2_per_litre: number;
}

import type { RideMode } from "./modes";

export interface Vehicle {
  id: string;
  model: string;
  registrationNumber: string;
  type: RideMode;
  seatingCapacity: number;
  fuelType: "PETROL" | "DIESEL" | "CNG" | "EV" | "HYBRID";
  mileageKmpl: number;
  active: boolean;
}

export interface SavedPlace {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Point {
  addr: string;
  lat: number;
  lng: number;
}

export type TripStatus =
  | "RIDE_BOOKED"
  | "TRIP_STARTED"
  | "TRIP_IN_PROGRESS"
  | "TRIP_COMPLETED"
  | "PAYMENT_PENDING"
  | "PAYMENT_COMPLETED";

export interface MatchResult {
  ride: {
    id: string;
    originAddr: string;
    destAddr: string;
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    routePolyline: string;
    departureTime: string;
    availableSeats: number;
    totalSeats: number;
    farePerSeat: number;
    distanceKm: number;
    driver: { id: string; name: string; phone: string | null };
    vehicle: { model: string; registrationNumber: string; fuelType: string; type: RideMode };
  };
  match: { score: number; routeOverlapPct: number; detourKm: number; reasons: string[] };
}
