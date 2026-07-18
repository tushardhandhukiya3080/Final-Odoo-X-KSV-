// Client-side Razorpay Checkout launcher. When the order is a mock (no keys
// configured) it resolves instantly so the flow still completes in a demo.
export interface OrderInfo {
  orderId: string;
  amount: number;
  keyId: string;
  mock: boolean;
}

export interface CheckoutResult {
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface RazorpayWindow {
  Razorpay?: new (options: unknown) => { open: () => void };
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as RazorpayWindow).Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

export async function openCheckout(
  order: OrderInfo,
  opts: { name: string; description: string; prefill?: { name?: string; email?: string } },
): Promise<CheckoutResult> {
  if (order.mock || !order.keyId) {
    // Sandbox-less demo path — server auto-verifies "order_mock_*".
    return { razorpayPaymentId: `pay_mock_${Date.now()}`, razorpaySignature: "mock" };
  }
  await loadScript();
  return new Promise((resolve, reject) => {
    const Rzp = (window as RazorpayWindow).Razorpay!;
    const rzp = new Rzp({
      key: order.keyId,
      amount: order.amount,
      currency: "INR",
      order_id: order.orderId,
      name: opts.name,
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: "#4f7cff" },
      handler: (res: { razorpay_payment_id: string; razorpay_signature: string }) =>
        resolve({
          razorpayPaymentId: res.razorpay_payment_id,
          razorpaySignature: res.razorpay_signature,
        }),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}
