// Multi-stop ride progress helpers. A ride passes waypoints in order:
// [origin, ...stops, dest]. progress_index is the last reached waypoint.
import { haversineKm } from "./geo";
import type { LatLng } from "./types";

export interface Stop {
  label: string;
  lat: number;
  lng: number;
}

export function waypointsOf(origin: Stop, stops: Stop[], dest: Stop): Stop[] {
  return [origin, ...stops, dest];
}

// A ride is no longer catchable once the driver reaches the destination.
// manual → progress reached the last waypoint; gps → last ping is ~at the dest.
export function isArrived(opts: {
  mode: string;
  progressIndex: number;
  waypointCount: number;
  last: LatLng | null;
  dest: LatLng;
}): boolean {
  const { mode, progressIndex, waypointCount, last, dest } = opts;
  if (mode === "manual") return progressIndex >= waypointCount - 1;
  return last != null && haversineKm(last, dest) < 0.4;
}

// ponytail: quick self-check — run with `node --import tsx src/lib/rides.ts`
if (process.argv[1] && process.argv[1].endsWith("rides.ts")) {
  const dest = { lat: 23.0, lng: 72.5 };
  console.assert(isArrived({ mode: "manual", progressIndex: 3, waypointCount: 4, last: null, dest }) === true, "manual arrived");
  console.assert(isArrived({ mode: "manual", progressIndex: 1, waypointCount: 4, last: null, dest }) === false, "manual mid-route");
  console.assert(isArrived({ mode: "gps", progressIndex: 0, waypointCount: 2, last: { lat: 23.0005, lng: 72.5005 }, dest }) === true, "gps near dest");
  console.assert(isArrived({ mode: "gps", progressIndex: 0, waypointCount: 2, last: { lat: 23.2, lng: 72.7 }, dest }) === false, "gps far");
  console.log("rides.ts self-check ok");
}
