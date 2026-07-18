// Wallet money movement — always inside a DB transaction so balance and the
// ledger row can never diverge. Amounts are rupees. Ledger stores signed amounts
// (credits positive, debits negative) with the resulting balance.
import { pool } from "./db";
import { ApiError } from "./api";

type CreditType = "recharge" | "credit";
type DebitType = "payment";

export async function creditWallet(
  userId: string,
  amount: number,
  type: CreditType,
  reference?: string,
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ wallet_balance: string }>(
      "UPDATE users SET wallet_balance = wallet_balance + $2 WHERE id = $1 RETURNING wallet_balance",
      [userId, amount],
    );
    const balance = Number(rows[0].wallet_balance);
    await client.query(
      `INSERT INTO wallet_txns (user_id, type, amount, balance_after, reference)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, amount, balance, reference ?? null],
    );
    await client.query("COMMIT");
    return balance;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function debitWallet(
  userId: string,
  amount: number,
  type: DebitType,
  reference?: string,
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Lock the row so two concurrent debits can't both pass the balance check.
    const { rows } = await client.query<{ wallet_balance: string }>(
      "SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    const current = Number(rows[0]?.wallet_balance ?? 0);
    if (current < amount) {
      throw new ApiError("Insufficient wallet balance. Recharge and try again.", 400);
    }
    const balance = current - amount;
    await client.query("UPDATE users SET wallet_balance = $2 WHERE id = $1", [
      userId,
      balance,
    ]);
    await client.query(
      `INSERT INTO wallet_txns (user_id, type, amount, balance_after, reference)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, -amount, balance, reference ?? null],
    );
    await client.query("COMMIT");
    return balance;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
