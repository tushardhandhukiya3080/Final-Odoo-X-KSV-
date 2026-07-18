import { route, ok, body } from "@/lib/api";
import { routeSchema } from "@/lib/validation";
import { routeVia } from "@/lib/geo";

// Calculate driving route (distance, ETA, geometry) through from → via… → to.
export const POST = route(async (req) => {
  const { from, to, via } = await body(req, routeSchema);
  return ok(await routeVia([from, ...via, to]));
});
