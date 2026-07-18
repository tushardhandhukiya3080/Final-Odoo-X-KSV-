import { route, ok } from "@/lib/api";
import { query } from "@/lib/db";

export const GET = route(async (_req, { user }) => {
  const bal = await query<{ wallet_balance: string }>(
    "SELECT wallet_balance FROM users WHERE id=$1",
    [user.id],
  );
  const txns = await query<{
    id: string;
    type: string;
    amount: string;
    balance_after: string;
    reference: string | null;
    created_at: Date;
  }>(
    `SELECT id, type, amount, balance_after, reference, created_at
       FROM wallet_txns WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [user.id],
  );
  return ok({
    balance: Number(bal.rows[0]?.wallet_balance ?? 0),
    transactions: txns.rows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: Number(t.balance_after),
      reference: t.reference,
      at: t.created_at,
    })),
  });
});
