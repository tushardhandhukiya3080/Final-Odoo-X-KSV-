import { route, ok, body, ApiError } from "@/lib/api";
import { paymentVerifySchema } from "@/lib/validation";
import { loadPayable, markPaid } from "@/lib/payments";
import { verifySignature } from "@/lib/razorpay";
import { publish } from "@/lib/events";

// Confirm a Razorpay card/UPI payment via signature, then flag the booking paid.
export const POST = route(async (req, { user }) => {
  const d = await body(req, paymentVerifySchema);
  const payable = await loadPayable(d.bookingId, user.id);

  if (!verifySignature(d.razorpayOrderId, d.razorpayPaymentId, d.razorpaySignature)) {
    throw new ApiError("Payment verification failed", 400);
  }

  await markPaid(d.bookingId, d.method, payable.fareAmount, {
    orderId: d.razorpayOrderId,
    paymentId: d.razorpayPaymentId,
  });
  publish("payment.completed", { bookingId: d.bookingId, message: "✅ Payment received" });
  return ok({ paid: true });
});
