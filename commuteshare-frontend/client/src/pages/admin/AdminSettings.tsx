import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Save, Fuel, IndianRupee, Leaf, Coins } from "lucide-react";
import { api, apiError } from "../../lib/api";
import { Card, Spinner } from "../../components/ui";

interface Settings { fuel_cost_per_litre: number; cost_per_km: number; currency: string; co2_per_litre: number; }

export default function AdminSettings() {
  const qc = useQueryClient();
  const cfg = useQuery({ queryKey: ["admin-settings"], queryFn: async () => (await api.get<{ name: string; domain: string; settings: Settings }>("/admin/settings")).data });
  const [form, setForm] = useState<Settings>({ fuel_cost_per_litre: 105, cost_per_km: 8, currency: "INR", co2_per_litre: 2.31 });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (cfg.data?.settings) setForm(cfg.data.settings); }, [cfg.data]);
  const set = (k: keyof Settings, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/admin/settings", form);
      toast.success("Settings saved — reports recalculate from these values");
      qc.invalidateQueries({ queryKey: ["org-report"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (cfg.isLoading) return <Spinner className="text-brand-500" />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Org Settings</h1><p className="text-sm text-slate-500">{cfg.data?.name} · {cfg.data?.domain}. These values drive every cost & sustainability report.</p></div>

      <Card className="max-w-2xl">
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Fuel cost / litre" icon={<Fuel className="h-4 w-4 text-amber-500" />}><input type="number" step="0.1" className="input" value={form.fuel_cost_per_litre} onChange={(e) => set("fuel_cost_per_litre", +e.target.value)} /></Field>
          <Field label="Cost / km" icon={<IndianRupee className="h-4 w-4 text-brand-500" />}><input type="number" step="0.1" className="input" value={form.cost_per_km} onChange={(e) => set("cost_per_km", +e.target.value)} /></Field>
          <Field label="Currency" icon={<Coins className="h-4 w-4 text-slate-500" />}><input className="input" value={form.currency} onChange={(e) => set("currency", e.target.value)} /></Field>
          <Field label="CO₂ per litre (kg)" icon={<Leaf className="h-4 w-4 text-brand-500" />}><input type="number" step="0.01" className="input" value={form.co2_per_litre} onChange={(e) => set("co2_per_litre", +e.target.value)} /></Field>
          <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : <><Save className="h-4 w-4" /> Save settings</>}</button></div>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div><label className="label flex items-center gap-1.5">{icon}{label}</label>{children}</div>;
}
