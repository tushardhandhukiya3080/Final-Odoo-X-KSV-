"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { openCheckout, type OrderInfo } from "@/lib/checkout";

interface Props {
  bookingId: string;
  amount: number;
  onPaid: () => void;
}

const METHODS = [
  { key: "wallet", label: "Wallet", icon: "💳" },
  { key: "upi", label: "UPI", icon: "📱" },
  { key: "card", label: "Card", icon: "💳" },
  { key: "cash", label: "Cash", icon: "💵" },
] as const;

export default function PaymentPanel({ bookingId, amount, onPaid }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(method: (typeof METHODS)[number]["key"]) {
    setBusy(method);
    setError(null);
    try {
      if (method === "cash" || method === "wallet") {
        await api("/api/payments/direct", { method: "POST", body: { bookingId, method } });
      } else {
        // Card / UPI → Razorpay order + checkout + verify.
        const order = await api<OrderInfo>("/api/payments/order", {
          method: "POST",
          body: { bookingId },
        });
        const result = await openCheckout(order, {
          name: "RideShare",
          description: `Trip fare ₹${amount}`,
        });
        await api("/api/payments/verify", {
          method: "POST",
          body: {
            bookingId,
            method,
            razorpayOrderId: order.orderId,
            razorpayPaymentId: result.razorpayPaymentId,
            razorpaySignature: result.razorpaySignature,
          },
        });
      }
      onPaid();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="surface" style={{ border: "1px solid rgba(245,166,35,.4)" }}>
      <div className="row-between">
        <strong>Payment due</strong>
        <span className="fare">₹{amount.toFixed(2)}</span>
      </div>
      <p className="muted sm" style={{ margin: "6px 0 14px" }}>
        Trip completed — settle the fare with your preferred method.
      </p>
      {error && <div className="error">{error}</div>}
      <div className="grid cols-4">
        {METHODS.map((m) => (
          <button
            key={m.key}
            className="btn-ghost"
            style={{ padding: "14px 8px", flexDirection: "column" }}
            onClick={() => pay(m.key)}
            disabled={busy !== null}
          >
            <div style={{ fontSize: "1.3rem" }}>{m.icon}</div>
            {busy === m.key ? "…" : m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
