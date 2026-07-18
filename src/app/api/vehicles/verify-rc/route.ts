import { z } from "zod";
import { route, ok, body } from "@/lib/api";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import { verifyRc } from "@/lib/rc";

const schema = z.object({ plate: z.string().trim().min(3).max(20) });

// Look a plate up against the RTO (Cashfree/VAHAN). Auth-only. Returns the real
// registration record (owner, model, insurance…) when a provider key is set;
// otherwise ok:false + configured:false so the client uses the local check.
export const POST = route(async (req, { user }) => {
  void user; // auth enforced by route()
  const { plate } = await body(req, schema);
  const norm = normalizePlate(plate);
  if (!isValidPlate(norm)) {
    return ok({ configured: true, ok: false, reason: "Not a valid Indian plate format" });
  }
  return ok(await verifyRc(norm));
});
