import { route, ok, body } from "@/lib/api";
import { query } from "@/lib/db";
import { profileSchema } from "@/lib/validation";

export const PATCH = route(async (req, { user }) => {
  const d = await body(req, profileSchema);
  const { rows } = await query<{ name: string | null; phone: string | null }>(
    `UPDATE users SET name = COALESCE($2, name), phone = $3 WHERE id = $1
     RETURNING name, phone`,
    [user.id, d.name ?? null, d.phone?.trim() || null],
  );
  return ok(rows[0]);
});
