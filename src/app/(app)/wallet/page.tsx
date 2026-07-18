"use client";

import { useEffect, useState } from "react";
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase text-slate-900">Wallet</h1>
        <p className="text-sm font-semibold text-slate-500">Recharge and pay for rides instantly.</p>
      </div>

      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        {/* Balance + recharge hero */}
        <div className="bento-brand lg:col-span-1">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-100">
            <WalletIcon className="h-5 w-5" /> Available balance
          </div>
          <div className="relative mt-2 font-display text-4xl font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            ₹{balance.toFixed(2)}
          </div>
          <div className="relative mt-1 text-sm font-semibold text-brand-100">Use it to pay trip fares in one tap.</div>

          <div className="relative mt-6 text-[11px] font-extrabold uppercase tracking-widest text-brand-100">Recharge</div>
          <div className="relative mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-white/25 transition ${
                  amount === p ? "bg-white text-brand-700 shadow-sm" : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                ₹{p}
              </button>
            ))}
          </div>

          <div className="relative mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-brand-100">Amount (₹)</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(+e.target.value)}
              className="input"
            />
          </div>

          <button
            type="button"
            onClick={recharge}
            disabled={busy}
            className="lp-btn mt-4 w-full bg-gradient-to-b from-[#fcd775] to-[#efab24] font-extrabold uppercase text-[#5c3702] disabled:opacity-60"
          >
            {busy ? "Processing…" : (<><Plus className="h-4 w-4" /> Add ₹{amount}</>)}
          </button>
        </div>

        {/* Transaction ledger */}
        <div className="bento lg:col-span-2">
          <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Transactions</div>
          {txns.length === 0 ? (
            <div className="mt-3 grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
              <div className="font-display text-lg font-bold text-slate-700">No transactions yet</div>
              <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">
                Recharge or complete a paid ride to see entries here.
              </div>
            </div>
          ) : (
            <div className="mt-2 divide-y divide-slate-100">
              {txns.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-9 w-9 place-items-center rounded-full ${
                        t.amount >= 0 ? "bg-teal-50 text-teal-600" : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {t.amount >= 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold capitalize text-slate-800">{t.type}</div>
                      <div className="text-[11px] font-semibold text-slate-400">{new Date(t.at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-extrabold ${t.amount >= 0 ? "text-teal-600" : "text-rose-600"}`}>
                      {t.amount >= 0 ? "+" : "−"}₹{Math.abs(t.amount).toFixed(2)}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400">bal ₹{t.balanceAfter.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
