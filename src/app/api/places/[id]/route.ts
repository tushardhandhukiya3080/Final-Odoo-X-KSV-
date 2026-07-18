import { route, ok, ApiError } from "@/lib/api";
import { query } from "@/lib/db";

export const DELETE = route(async (_req, { user, params }) => {
  const { rowCount } = await query(
    "DELETE FROM saved_places WHERE id=$1 AND user_id=$2",
    [params.id, user.id],
  );
  if (!rowCount) throw new ApiError("Place not found", 404);
  return ok({ deleted: true });
});
