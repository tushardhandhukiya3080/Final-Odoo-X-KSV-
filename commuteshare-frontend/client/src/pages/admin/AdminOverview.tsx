import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, Car, Route as RouteIcon, Leaf, IndianRupee, TrendingUp, Building2, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { api } from "../../lib/api";
import { useAuth } from "../../store/auth";
import { Card, Stat, Skeleton } from "../../components/ui";
import { inr, km } from "../../lib/format";

interface OrgReport {
  currency: string;
  totals: { trips: number; distanceKm: number; fuelLitres: number; fuelCost: number; costPerKm: number; co2SavedKg: number; participationPct: number; totalEmployees: number; activeParticipants: number; };
  perVehicle: { model: string; reg: string; trips: number; distanceKm: number; fuelCost: number; efficiencyKmPerL: number; }[];
  trend: { date: string; distance: number }[];
}

export default function AdminOverview() {
  const org = useAuth((s) => s.org);
  const report = useQuery({ queryKey: ["org-report"], queryFn: async () => (await api.get<OrgReport>("/reports/org")).data });
  const t = report.data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-white"><Building2 className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{org?.name}</h1>
          <p className="flex items-center gap-1 text-sm text-slate-500"><Shield className="h-3.5 w-3.5" /> Company Admin · configuration & oversight</p>
        </div>
      </div>

      {report.isLoading ? (
        <div className="bento-grid">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="col-span-1 h-32 rounded-3xl lg:col-span-3" />)}</div>
      ) : (
        <div className="bento-grid">
          <Stat className="lg:col-span-3" label="Total trips" value={t?.trips ?? 0} icon={<RouteIcon className="h-5 w-5" />} />
          <Stat className="lg:col-span-3" label="Participation" value={`${t?.participationPct ?? 0}%`} sub={`${t?.activeParticipants ?? 0}/${t?.totalEmployees ?? 0} employees`} icon={<Users className="h-5 w-5" />} accent="blue" />
          <Stat className="lg:col-span-3" label="CO₂ saved" value={`${t?.co2SavedKg ?? 0} kg`} icon={<Leaf className="h-5 w-5" />} />
          <Stat className="lg:col-span-3" label="Fuel cost" value={inr(t?.fuelCost ?? 0)} sub={`${t?.fuelLitres ?? 0} L`} icon={<IndianRupee className="h-5 w-5" />} accent="amber" />

          {/* Big chart tile */}
          <div className="col-span-2 lg:col-span-8 bento">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><TrendingUp className="h-4 w-4 text-brand-500" /> Distance shared by day (km)</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.data?.trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="distance" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick links tile */}
          <div className="col-span-2 lg:col-span-4 bento">
            <div className="mb-3 text-sm font-bold text-slate-700">Quick links</div>
            <div className="space-y-2">
              <Link to="/app/admin/employees" className="btn-ghost w-full justify-start"><Users className="h-4 w-4" /> Manage employees</Link>
              <Link to="/app/admin/vehicles" className="btn-ghost w-full justify-start"><Car className="h-4 w-4" /> View fleet</Link>
              <Link to="/app/admin/reports" className="btn-ghost w-full justify-start"><TrendingUp className="h-4 w-4" /> Full analytics</Link>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
              Cost config: <b>{inr(t?.costPerKm ?? 0)}/km</b>. Admins configure settings and oversee participation — they don't book or drive.
            </div>
          </div>
        </div>
      )}

      <Card className="p-5">
        <div className="mb-3 text-sm font-bold text-slate-700">Fleet cost breakdown</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="py-2">Vehicle</th><th>Trips</th><th>Distance</th><th>Efficiency</th><th className="text-right">Fuel cost</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(report.data?.perVehicle ?? []).map((v) => (
                <tr key={v.reg}><td className="py-2 font-medium text-slate-700">{v.model} <span className="text-slate-400">· {v.reg}</span></td><td>{v.trips}</td><td>{km(v.distanceKm)}</td><td>{v.efficiencyKmPerL} km/L</td><td className="text-right font-semibold">{inr(v.fuelCost)}</td></tr>
              ))}
              {(report.data?.perVehicle.length ?? 0) === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">No completed trips yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
