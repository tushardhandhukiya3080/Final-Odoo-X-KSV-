import { route, ok, body, ApiError } from "@/lib/api";
import { rechargeSchema, walletConfirmSchema } from "@/lib/validation";
import { createOrder, verifySignature } from "@/lib/razorpay";
import { creditWallet } from "@/lib/wallet";
import { publish } from "@/lib/events";

// Step 1 — POST creates a Razorpay order for the recharge amount.
export const POST = route(async (req, { user }) => {
  const { amount } = await body(req, rechargeSchema);
  const order = await createOrder(amount, `wal_${user.id.slice(0, 18)}`);
  return ok({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    mock: order.mock,
    // Key ID is public; fall back to RAZORPAY_KEY_ID so the two server keys
    // alone are enough to open the checkout popup.
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
  });
});

// Step 2 — PUT confirms the payment (signature) and credits the wallet.
export const PUT = route(async (req, { user }) => {
  const d = await body(req, walletConfirmSchema);
  if (!verifySignature(d.razorpayOrderId, d.razorpayPaymentId, d.razorpaySignature)) {
    throw new ApiError("Payment verification failed", 400);
  }
  const balance = await creditWallet(user.id, d.amount, "recharge", d.razorpayOrderId);
  publish("wallet.recharged", { message: "💰 Wallet recharged" });
  return ok({ balance });
});
