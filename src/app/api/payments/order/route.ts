import { route, ok, body } from "@/lib/api";
import { paymentOrderSchema } from "@/lib/validation";
import { loadPayable } from "@/lib/payments";
import { createOrder } from "@/lib/razorpay";

// Create a Razorpay order for a card/UPI payment of a completed trip.
export const POST = route(async (req, { user }) => {
  const { bookingId } = await body(req, paymentOrderSchema);
  const payable = await loadPayable(bookingId, user.id);
  const order = await createOrder(payable.fareAmount, `bk_${bookingId.slice(0, 18)}`);
  return ok({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    mock: order.mock,
    // The Razorpay Key ID is public (it goes in the browser checkout). Fall back
    // to RAZORPAY_KEY_ID so setting just the two server keys is enough — without
    // this, a real order with an empty keyId silently skips the popup.
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
  });
});
