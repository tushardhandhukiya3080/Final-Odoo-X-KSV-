import { route, ok } from "@/lib/api";
import { geocode } from "@/lib/geo";

export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return ok([]);
  return ok(await geocode(q));
});
