// Mapping helpers — all free/no-key: OSRM routing, Nominatim geocoding, and a
// local haversine for ride matching. Server-only (called from route handlers).
import { ApiError } from "./api";
import type { LatLng, RouteResult } from "./types";

const OSRM = process.env.OSRM_URL || "https://router.project-osrm.org";
const NOMINATIM = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
const UA = "RideShare-Carpool/1.0 (hackathon demo)";

/** Driving route through an ordered list of points (>=2), via OSRM waypoints. */
export async function routeVia(points: LatLng[]): Promise<RouteResult> {
  if (points.length < 2) throw new ApiError("Need at least an origin and destination", 400);
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  let data: {
    routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
  };
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    data = await res.json();
  } catch {
    throw new ApiError("Routing service is unavailable, try again", 502);
  }
  const r = data.routes?.[0];
  if (!r) throw new ApiError("No route found between those points", 404);
  return {
    distanceKm: Number((r.distance / 1000).toFixed(2)),
    durationMin: Number((r.duration / 60).toFixed(1)),
    coordinates: r.geometry.coordinates,
  };
}

/** Driving route between two points: distance, duration, and geojson geometry. */
export function routeBetween(from: LatLng, to: LatLng): Promise<RouteResult> {
  return routeVia([from, to]);
}

export interface GeocodeHit {
  label: string;
  lat: number;
  lng: number;
}

/** Free-text address → candidate coordinates (Nominatim). */
export async function geocode(q: string): Promise<GeocodeHit[]> {
  const url = `${NOMINATIM}/search?format=json&limit=6&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return [];
    const data: { display_name: string; lat: string; lon: string }[] = await res.json();
    return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
  } catch {
    return [];
  }
}

/** Coordinates → a human address label (Nominatim reverse geocoding). */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const fallback = `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  const url = `${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return fallback;
    const d: { display_name?: string } = await res.json();
    return d.display_name || fallback;
  } catch {
    return fallback;
  }
}

/** Great-circle distance in km — used to score ride matches. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
