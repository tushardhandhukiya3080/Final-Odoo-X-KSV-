// Payment settlement helpers. A booking is payable only after its trip is
// completed and while payment is still pending.
import { pool, query } from "./db";
import { ApiError } from "./api";
import type { PaymentMethod } from "./types";

export interface Payable {
  id: string;
  fareAmount: number;
  driverId: string;
}

export async function loadPayable(bookingId: string, userId: string): Promise<Payable> {
  const { rows } = await query<{
    id: string;
    passenger_id: string;
    fare_amount: string;
    status: string;
    payment_status: string;
    driver_id: string;
  }>(
    `SELECT b.id, b.passenger_id, b.fare_amount, b.status, b.payment_status, r.driver_id
       FROM bookings b JOIN rides r ON r.id = b.ride_id
      WHERE b.id = $1`,
    [bookingId],
  );
  const bk = rows[0];
  if (!bk) throw new ApiError("Booking not found", 404);
  if (bk.passenger_id !== userId) throw new ApiError("Forbidden", 403);
  if (bk.payment_status === "completed") throw new ApiError("This trip is already paid", 400);
  if (bk.status !== "completed") throw new ApiError("You can pay once the trip is completed", 400);
  return { id: bk.id, fareAmount: Number(bk.fare_amount), driverId: bk.driver_id };
}

/** Cash / card / UPI: record the payment and flag the booking paid. */
export async function markPaid(
  bookingId: string,
  method: PaymentMethod,
  amount: number,
  refs?: { orderId?: string; paymentId?: string },
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO payments (booking_id, method, amount, status, razorpay_order_id, razorpay_payment_id)
       VALUES ($1,$2,$3,'completed',$4,$5)`,
      [bookingId, method, amount, refs?.orderId ?? null, refs?.paymentId ?? null],
    );
    await client.query("UPDATE bookings SET payment_status='completed' WHERE id=$1", [bookingId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Wallet: debit passenger, credit driver, record payment + ledger — all atomic. */
export async function payWithWallet(
  bookingId: string,
  passengerId: string,
  driverId: string,
  amount: number,
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bal = await client.query<{ wallet_balance: string }>(
      "SELECT wallet_balance FROM users WHERE id=$1 FOR UPDATE",
      [passengerId],
    );
    const current = Number(bal.rows[0]?.wallet_balance ?? 0);
    if (current < amount) {
      throw new ApiError("Insufficient wallet balance. Recharge and try again.", 400);
    }
    const passengerBalance = current - amount;
    await client.query("UPDATE users SET wallet_balance=$1 WHERE id=$2", [passengerBalance, passengerId]);
    await client.query(
      `INSERT INTO wallet_txns (user_id, type, amount, balance_after, reference)
       VALUES ($1,'payment',$2,$3,$4)`,
      [passengerId, -amount, passengerBalance, bookingId],
    );

    // Credit the driver's earnings.
    const dRow = await client.query<{ wallet_balance: string }>(
      "UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id=$2 RETURNING wallet_balance",
      [amount, driverId],
    );
    await client.query(
      `INSERT INTO wallet_txns (user_id, type, amount, balance_after, reference)
       VALUES ($1,'credit',$2,$3,$4)`,
      [driverId, amount, Number(dRow.rows[0].wallet_balance), bookingId],
    );

    await client.query(
      "INSERT INTO payments (booking_id, method, amount, status) VALUES ($1,'wallet',$2,'completed')",
      [bookingId, amount],
    );
    await client.query("UPDATE bookings SET payment_status='completed' WHERE id=$1", [bookingId]);
    await client.query("COMMIT");
    return passengerBalance;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
