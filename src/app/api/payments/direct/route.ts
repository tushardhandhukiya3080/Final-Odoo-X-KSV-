import { route, ok, body } from "@/lib/api";
import { paymentDirectSchema } from "@/lib/validation";
import { loadPayable, markPaid, payWithWallet } from "@/lib/payments";
import { publish } from "@/lib/events";

// Cash (settled offline) or wallet (moves balance passenger → driver).
export const POST = route(async (req, { user }) => {
  const { bookingId, method } = await body(req, paymentDirectSchema);
  const payable = await loadPayable(bookingId, user.id);

  if (method === "wallet") {
    const balance = await payWithWallet(bookingId, user.id, payable.driverId, payable.fareAmount);
    publish("payment.completed", { bookingId, message: "✅ Paid from wallet" });
    return ok({ paid: true, method, balance });
  }

  await markPaid(bookingId, "cash", payable.fareAmount);
  publish("payment.completed", { bookingId, message: "✅ Cash payment recorded" });
  return ok({ paid: true, method });
});
