import { useQuery } from "@tanstack/react-query";
import { Leaf, IndianRupee, Route as RouteIcon, Fuel, Users, Gauge } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { api } from "../../lib/api";
import { Card, Stat, Skeleton } from "../../components/ui";
import { inr, km } from "../../lib/format";

interface OrgReport {
  totals: { trips: number; distanceKm: number; fuelLitres: number; fuelCost: number; costPerKm: number; co2SavedKg: number; participationPct: number; totalEmployees: number; activeParticipants: number; };
  perVehicle: { model: string; reg: string; trips: number; distanceKm: number; fuelCost: number; efficiencyKmPerL: number; }[];
  trend: { date: string; distance: number; efficiencyKmPerL: number }[];
}

export default function AdminReports() {
  const report = useQuery({ queryKey: ["org-report"], queryFn: async () => (await api.get<OrgReport>("/reports/org")).data });
  const t = report.data?.totals;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Analytics</h1><p className="text-sm text-slate-500">Organization-wide cost, fuel and sustainability metrics.</p></div>

      {report.isLoading ? <div className="bento-grid">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="col-span-1 h-32 rounded-3xl lg:col-span-3" />)}</div> :
        <div className="bento-grid">
          <Stat className="lg:col-span-3" label="Trips" value={t?.trips ?? 0} icon={<RouteIcon className="h-5 w-5" />} />
          <Stat className="lg:col-span-3" label="Total distance" value={km(t?.distanceKm ?? 0)} icon={<Gauge className="h-5 w-5" />} accent="blue" />
          <Stat className="lg:col-span-3" label="Fuel consumed" value={`${t?.fuelLitres ?? 0} L`} sub={inr(t?.fuelCost ?? 0)} icon={<Fuel className="h-5 w-5" />} accent="amber" />
          <Stat className="lg:col-span-3" label="CO₂ saved" value={`${t?.co2SavedKg ?? 0} kg`} icon={<Leaf className="h-5 w-5" />} />
        </div>
      }

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-2 text-sm font-bold text-slate-700">Vehicle-wise fuel cost</div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.data?.perVehicle ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => inr(v)} />
                <Bar dataKey="fuelCost" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="mb-2 text-sm font-bold text-slate-700">Fuel efficiency trend (km/L)</div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.data?.trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip />
                <Line type="monotone" dataKey="efficiencyKmPerL" stroke="#2dd4bf" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="bg-brand-50/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-brand-700"><Users className="h-5 w-5" /><span className="font-bold">Employee participation</span></div>
          <div className="text-sm text-brand-800">{t?.activeParticipants ?? 0} of {t?.totalEmployees ?? 0} employees actively carpooling — <b>{t?.participationPct ?? 0}%</b></div>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${t?.participationPct ?? 0}%` }} />
        </div>
      </Card>
    </div>
  );
}
