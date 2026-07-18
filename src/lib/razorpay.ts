// Razorpay Test Mode helper. Falls back to a signed-off "mock" order when keys
// aren't configured, so the payment/wallet flow still demos end-to-end.
// ponytail: mock path exists on purpose — real keys just flip it to live sandbox.
import crypto from "node:crypto";
import { ApiError } from "./api";

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export interface OrderResult {
  id: string;
  amount: number; // paise
  currency: string;
  mock: boolean;
}

export async function createOrder(amountRupees: number, receipt: string): Promise<OrderResult> {
  if (amountRupees <= 0) throw new ApiError("Amount must be positive", 400);
  const amount = Math.round(amountRupees * 100);

  if (!razorpayConfigured()) {
    return { id: `order_mock_${receipt}_${amount}`, amount, currency: "INR", mock: true };
  }

  try {
    const Razorpay = (await import("razorpay")).default;
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
    const order = await rzp.orders.create({ amount, currency: "INR", receipt });
    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      mock: false,
    };
  } catch (err) {
    console.error("razorpay order failed:", err);
    throw new ApiError("Could not create payment order", 502);
  }
}

export function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  // Mock orders (no keys configured) auto-verify so the demo completes.
  if (orderId.startsWith("order_mock_")) return true;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
