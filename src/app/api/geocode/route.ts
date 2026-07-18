import { route, ok } from "@/lib/api";
import { geocode, reverseGeocode } from "@/lib/geo";

export const GET = route(async (req) => {
  const sp = new URL(req.url).searchParams;
  // Reverse: coordinates → address label (used by the map picker).
  const lat = sp.get("lat");
  const lng = sp.get("lng");
  if (lat && lng) {
    const la = Number(lat);
    const ln = Number(lng);
    return ok({ lat: la, lng: ln, label: await reverseGeocode(la, ln) });
  }
  // Forward: free-text address → candidate coordinates.
  const q = sp.get("q")?.trim() ?? "";
  if (q.length < 2) return ok([]);
  return ok(await geocode(q));
});
