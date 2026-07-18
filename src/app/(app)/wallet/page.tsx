"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { openCheckout, type OrderInfo } from "@/lib/checkout";

interface Txn {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reference: string | null;
  at: string;
}

const PRESETS = [100, 200, 500, 1000];

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const w = await api<{ balance: number; transactions: Txn[] }>("/api/wallet");
    setBalance(w.balance);
    setTxns(w.transactions);
  }
  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, []);

  async function recharge() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const order = await api<OrderInfo>("/api/wallet/recharge", {
        method: "POST",
        body: { amount },
      });
      const res = await openCheckout(order, { name: "RideShare Wallet", description: `Add ₹${amount}` });
      await api("/api/wallet/recharge", {
        method: "PUT",
        body: {
          amount,
          razorpayOrderId: order.orderId,
          razorpayPaymentId: res.razorpayPaymentId,
          razorpaySignature: res.razorpaySignature,
        },
      });
      setMsg(`₹${amount} added to your wallet`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Wallet</h1>
        <p>Recharge and pay for rides instantly.</p>
      </div>

      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="grid cols-2">
        <div className="surface" style={{ background: "linear-gradient(135deg, rgba(79,124,255,.25), rgba(124,92,255,.15))" }}>
          <div className="muted sm">Available balance</div>
          <div style={{ fontSize: "2.6rem", fontWeight: 800, margin: "6px 0 4px" }}>₹{balance.toFixed(2)}</div>
          <div className="muted sm">Use it to pay trip fares in one tap.</div>
        </div>

        <div className="surface">
          <div className="section-title" style={{ marginTop: 0 }}>Recharge</div>
          <div className="chips" style={{ marginBottom: 12 }}>
            {PRESETS.map((p) => (
              <span
                key={p}
                className="chip"
                style={amount === p ? { borderColor: "var(--primary)", color: "var(--text)" } : undefined}
                onClick={() => setAmount(p)}
              >
                ₹{p}
              </span>
            ))}
          </div>
          <div className="field">
            <label>Amount (₹)</label>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(+e.target.value)} />
          </div>
          <button className="btn-primary btn-block" onClick={recharge} disabled={busy}>
            {busy ? "Processing…" : `Add ₹${amount}`}
          </button>
        </div>
      </div>

      <div className="section-title">Transactions</div>
      <div className="surface">
        {txns.length === 0 ? (
          <p className="muted sm">No transactions yet.</p>
        ) : (
          txns.map((t) => (
            <div key={t.id} className="txn">
              <div>
                <strong style={{ textTransform: "capitalize" }}>{t.type}</strong>
                <div className="muted sm">{new Date(t.at).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className={`amt ${t.amount >= 0 ? "pos" : "neg"}`}>
                  {t.amount >= 0 ? "+" : "−"}₹{Math.abs(t.amount).toFixed(2)}
                </div>
                <div className="muted sm">bal ₹{t.balanceAfter.toFixed(2)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
