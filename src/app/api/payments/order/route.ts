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
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
  });
});
