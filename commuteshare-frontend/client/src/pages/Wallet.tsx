import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { api, apiError } from "../lib/api";
import { Card, Spinner, EmptyState } from "../components/ui";
import { inr, fmtTime } from "../lib/format";

interface Txn { id: string; type: "CREDIT" | "DEBIT"; amount: number; ref: string; createdAt: string; }
interface WalletData { balance: number; transactions: Txn[]; }

export default function Wallet() {
  const qc = useQueryClient();
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: async () => (await api.get<WalletData>("/wallet")).data });
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);

  async function recharge() {
    setBusy(true);
    try {
      await api.post("/wallet/recharge", { amount });
      toast.success(`Added ${inr(amount)} to wallet`);
      qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Wallet</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-brand-400 to-brand-700 p-5 text-white shadow-raised ring-1 ring-white/15 lg:col-span-1">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-100"><WalletIcon className="h-5 w-5" /> Balance</div>
          <div className="relative mt-2 font-display text-4xl font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">{inr(wallet.data?.balance ?? 0)}</div>
          <div className="relative mt-6 flex gap-2">
            {[200, 500, 1000].map((a) => (
              <button key={a} onClick={() => setAmount(a)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-white/25 transition ${amount === a ? "bg-white text-brand-700 shadow-sm" : "bg-white/15 text-white hover:bg-white/25"}`}>{inr(a)}</button>
            ))}
          </div>
          <div className="relative mt-3 flex gap-2">
            <input type="number" className="w-full rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-inner ring-1 ring-black/10 outline-none" value={amount} onChange={(e) => setAmount(+e.target.value)} />
            <button onClick={recharge} disabled={busy} className="rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2 text-sm font-extrabold uppercase text-amber-950 shadow-btn ring-1 ring-black/10 transition hover:brightness-105 active:translate-y-px disabled:opacity-60">{busy ? <Spinner /> : <><Plus className="inline h-4 w-4" /> Add</>}</button>
          </div>
        </div>

        <Card className="lg:col-span-2">
          <div className="mb-3 text-sm font-bold text-slate-700">Transaction ledger</div>
          {wallet.isLoading ? <Spinner className="text-brand-500" /> :
            (wallet.data?.transactions.length ?? 0) === 0 ? <EmptyState title="No transactions yet" hint="Recharge or complete a paid ride to see entries here." /> :
            <div className="divide-y divide-slate-100">
              {wallet.data!.transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-9 w-9 place-items-center rounded-full ${t.type === "CREDIT" ? "bg-brand-50 text-brand-600" : "bg-rose-50 text-rose-600"}`}>
                      {t.type === "CREDIT" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div><div className="text-sm font-semibold text-slate-700">{t.ref}</div><div className="text-[11px] text-slate-400">{fmtTime(t.createdAt)}</div></div>
                  </div>
                  <div className={`text-sm font-bold ${t.type === "CREDIT" ? "text-brand-600" : "text-rose-600"}`}>{t.type === "CREDIT" ? "+" : "−"}{inr(t.amount)}</div>
                </div>
              ))}
            </div>
          }
        </Card>
      </div>
    </div>
  );
}
