import { route, ok, body } from "@/lib/api";
import { routeSchema } from "@/lib/validation";
import { routeBetween } from "@/lib/geo";

// Calculate driving route (distance, ETA, geometry) between two points.
export const POST = route(async (req) => {
  const { from, to } = await body(req, routeSchema);
  return ok(await routeBetween(from, to));
});
