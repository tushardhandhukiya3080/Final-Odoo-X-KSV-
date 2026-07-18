import { useQuery } from "@tanstack/react-query";
import { Leaf, IndianRupee, Route as RouteIcon, Fuel, Navigation } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "../lib/api";
import { Card, Stat, Skeleton, EmptyState, Badge } from "../components/ui";
import { inr, fmtTime, km } from "../lib/format";

interface Summary { totalTrips: number; totalDistanceKm: number; fuelLitres: number; fuelCost: number; co2SavedKg: number; moneySaved: number; }
interface HistoryRow {
  id: string; status: string; completedAt: string; distanceKm: number; durationMin: number;
  role: "DRIVER" | "PASSENGER"; origin: string; dest: string; vehicle: string;
  driver: { name: string }; participants: { name: string; paid: boolean; fare: number }[];
}

export default function Reports() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: async () => (await api.get<Summary>("/reports/summary")).data });
  const history = useQuery({ queryKey: ["history"], queryFn: async () => (await api.get<HistoryRow[]>("/reports/history")).data });

  const s = summary.data;
  const pie = [
    { name: "As driver", value: history.data?.filter((h) => h.role === "DRIVER").length ?? 0, color: "#2563eb" },
    { name: "As passenger", value: history.data?.filter((h) => h.role === "PASSENGER").length ?? 0, color: "#60a5fa" },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">My Impact</h1><p className="text-sm text-slate-500">Your carpooling footprint and ride history.</p></div>

      {summary.isLoading ? (
        <div className="bento-grid">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="col-span-1 h-32 rounded-3xl lg:col-span-3" />)}</div>
      ) : (
        <div className="bento-grid">
          <Stat className="lg:col-span-3" label="Total trips" value={s?.totalTrips ?? 0} icon={<RouteIcon className="h-5 w-5" />} />
          <Stat className="lg:col-span-3" label="Distance" value={km(s?.totalDistanceKm ?? 0)} icon={<Navigation className="h-5 w-5" />} accent="blue" />
          <Stat className="lg:col-span-3" label="CO₂ saved" value={`${s?.co2SavedKg ?? 0} kg`} icon={<Leaf className="h-5 w-5" />} />
          <Stat className="lg:col-span-3" label="Money saved" value={inr(s?.moneySaved ?? 0)} icon={<IndianRupee className="h-5 w-5" />} accent="amber" />

          {/* Fuel & footprint */}
          <div className="col-span-2 lg:col-span-4 bento-amber">
            <div className="text-sm font-bold text-amber-800">Fuel & footprint</div>
            <div className="mt-3 space-y-2 text-sm">
              <Row k="Fuel consumed" v={`${s?.fuelLitres ?? 0} L`} icon={<Fuel className="h-4 w-4 text-amber-500" />} />
              <Row k="Fuel cost" v={inr(s?.fuelCost ?? 0)} />
              <Row k="CO₂ avoided" v={`${s?.co2SavedKg ?? 0} kg`} />
            </div>
          </div>

          {/* Driver vs passenger pie */}
          <div className="col-span-2 lg:col-span-4 bento">
            <div className="text-sm font-bold text-slate-700">Driver vs passenger</div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={3}>
                    {pie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs">
              {pie.map((e) => <div key={e.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: e.color }} />{e.name}</div>)}
            </div>
          </div>

          {/* Green story */}
          <div className="col-span-2 lg:col-span-4 bento-brand">
            <div className="text-sm font-bold text-white/90">🌍 Your green story</div>
            <p className="mt-2 text-sm text-brand-50">You've kept roughly <b className="text-white">{s?.co2SavedKg ?? 0} kg</b> of CO₂ out of the air and saved <b className="text-white">{inr(s?.moneySaved ?? 0)}</b> by sharing {s?.totalTrips ?? 0} commutes. Keep it up!</p>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 font-bold text-slate-800">Ride history</h2>
        {history.isLoading ? <Skeleton className="h-24" /> :
          (history.data?.length ?? 0) === 0 ? <EmptyState title="No completed rides yet" hint="Finish a trip to build your history." /> :
          <div className="grid gap-3">
            {history.data!.map((h) => (
              <Card key={h.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${h.role === "DRIVER" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>{h.role}</span>
                    <span className="font-semibold text-slate-700">{h.origin.split(",")[0]} → {h.dest.split(",")[0]}</span>
                  </div>
                  <div className="text-xs text-slate-400">{h.completedAt ? fmtTime(h.completedAt) : ""}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <Badge className="bg-slate-100 text-slate-600">{km(h.distanceKm)}</Badge>
                  <Badge className="bg-slate-100 text-slate-600">{h.vehicle}</Badge>
                  <Badge className="bg-slate-100 text-slate-600">driver {h.driver.name}</Badge>
                  {h.participants.map((p, i) => <Badge key={i} className={p.paid ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"}>{p.name} · {inr(p.fare)} {p.paid ? "✓" : "due"}</Badge>)}
                </div>
              </Card>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

function Row({ k, v, icon }: { k: string; v: string; icon?: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-slate-500">{icon}{k}</span><span className="font-semibold text-slate-700">{v}</span></div>;
}
