import {
  Route as RouteIcon, Navigation, Fuel, IndianRupee, Gauge, Calculator,
  Leaf, TreePine, Car,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { loadUserEco } from "@/lib/eco";

export const dynamic = "force-dynamic";

interface DriverRide {
  distance_km: number;
  depart_at: Date;
  model: string;
  registration_number: string;
  mileage_kmpl: number;
  fuel_type: string;
}

interface VehicleAgg {
  name: string;
  trips: number;
  distance: number;
  litres: number;
  cost: number;
  mileage: number;
}

export default async function ReportsPage() {
  const user = (await getCurrentUser())!;

  const org = await query<{ fuel_price_per_litre: string; cost_per_km: string; currency: string }>(
    "SELECT fuel_price_per_litre, cost_per_km, currency FROM organizations WHERE id=$1",
    [user.organizationId],
  );
  const fuelPrice = Number(org.rows[0]?.fuel_price_per_litre ?? 100);
  const costPerKm = Number(org.rows[0]?.cost_per_km ?? 6);

  const driver = await query<DriverRide>(
    `SELECT r.distance_km, r.depart_at, v.model, v.registration_number, v.mileage_kmpl, v.fuel_type
       FROM rides r JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.driver_id = $1 AND r.status = 'completed'`,
    [user.id],
  );
  const paxCount = await query<{ n: string }>(
    "SELECT count(*) n FROM bookings WHERE passenger_id=$1 AND status='completed'",
    [user.id],
  );
  const eco = await loadUserEco(user.id, fuelPrice);

  const rides = driver.rows;
  const totalDistance = rides.reduce((s, r) => s + Number(r.distance_km), 0);
  const totalLitres = rides.reduce((s, r) => s + Number(r.distance_km) / Number(r.mileage_kmpl), 0);
  const fuelCost = totalLitres * fuelPrice;
  const travelCost = totalDistance * costPerKm;
  const passengerTrips = Number(paxCount.rows[0]?.n ?? 0);

  // Vehicle-wise aggregation.
  const byVehicle = new Map<string, VehicleAgg>();
  for (const r of rides) {
    const key = r.registration_number;
    const name = `${r.model} · ${r.registration_number}`;
    const litres = Number(r.distance_km) / Number(r.mileage_kmpl);
    const agg = byVehicle.get(key) ?? { name, trips: 0, distance: 0, litres: 0, cost: 0, mileage: Number(r.mileage_kmpl) };
    agg.trips += 1;
    agg.distance += Number(r.distance_km);
    agg.litres += litres;
    agg.cost += litres * fuelPrice;
    byVehicle.set(key, agg);
  }
  const vehicles = [...byVehicle.values()].sort((a, b) => b.distance - a.distance);

  // Monthly distance trend (last 6 months).
  const months = lastMonths(6);
  const monthly = months.map((m) => ({
    label: m.label,
    distance: rides
      .filter((r) => sameMonth(new Date(r.depart_at), m.year, m.month))
      .reduce((s, r) => s + Number(r.distance_km), 0),
  }));
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.distance));
  const maxEff = Math.max(1, ...vehicles.map((v) => v.mileage));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase text-slate-900">Reports &amp; Analytics</h1>
        <p className="text-sm font-semibold text-slate-500">Your travel activity and transportation cost insights.</p>
      </div>

      <Section label="Overview">
        <div className="bento-grid">
          <Stat className="lg:col-span-4" icon={<RouteIcon className="h-4 w-4" />} label="Total trips" value={`${rides.length + passengerTrips}`} sub={`${rides.length} driven · ${passengerTrips} taken`} />
          <Stat className="lg:col-span-4" tint="bg-gradient-to-b from-[#a6d6fb] to-[#5aadee]" icon={<Navigation className="h-4 w-4" />} label="Distance driven" value={`${totalDistance.toFixed(1)} km`} />
          <Stat className="lg:col-span-4" icon={<Fuel className="h-4 w-4" />} label="Fuel consumed" value={`${totalLitres.toFixed(1)} L`} sub={`@ ₹${fuelPrice}/L`} />
          <Stat className="lg:col-span-4" dark tint="bg-gradient-to-b from-[#fcd775] to-[#efab24]" icon={<IndianRupee className="h-4 w-4" />} label="Fuel cost" value={`₹${fuelCost.toFixed(0)}`} />
          <Stat className="lg:col-span-4" tint="bg-gradient-to-b from-[#ccfaf3] to-[#7fe6d6]" icon={<Gauge className="h-4 w-4" />} label="Cost per km" value={`₹${costPerKm.toFixed(2)}`} sub="org configured" />
          <Stat className="lg:col-span-4" icon={<Calculator className="h-4 w-4" />} label="Est. travel cost" value={`₹${travelCost.toFixed(0)}`} sub={`${totalDistance.toFixed(0)} km × ₹${costPerKm}`} />
        </div>
      </Section>

      <Section label="🌱 Carbon Footprint & Savings">
        <div className="bento-brand">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-brand-100">Sustainability score</div>
              <div className="font-display text-6xl font-bold leading-none">{eco.greenScore}<span className="align-top text-lg font-bold text-brand-100"> / 100</span></div>
              <div className="mt-1 text-sm font-semibold text-brand-100">from {eco.sharedTrips} shared trip{eco.sharedTrips === 1 ? "" : "s"}</div>
            </div>
            <div className="text-5xl">🌍</div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <GreenStat icon={<Leaf className="h-4 w-4" />} label="CO₂ saved" value={`${eco.co2Kg} kg`} />
            <GreenStat icon={<Fuel className="h-4 w-4" />} label="Fuel saved" value={`${eco.fuelSavedL} L`} />
            <GreenStat icon={<IndianRupee className="h-4 w-4" />} label="Money saved" value={`₹${eco.moneySaved}`} />
            <GreenStat icon={<TreePine className="h-4 w-4" />} label="Trees / yr" value={String(eco.trees)} />
          </div>
        </div>
      </Section>

      <Section label="Monthly Distance">
        <div className="bento">
          {totalDistance === 0 ? (
            <p className="text-sm font-semibold text-slate-400">Complete a few trips to see trends.</p>
          ) : (
            <div className="flex items-end gap-4" style={{ height: 180 }}>
              {monthly.map((m) => (
                <div key={m.label} className="flex-1 text-center">
                  <div className="flex items-end justify-center" style={{ height: 140 }}>
                    <div
                      title={`${m.distance.toFixed(1)} km`}
                      className="w-8 rounded-t-lg bg-gradient-to-t from-[#5aadee] to-[#a6d6fb] shadow-btn ring-1 ring-black/10"
                      style={{ height: `${(m.distance / maxMonthly) * 100}%`, minHeight: m.distance > 0 ? 4 : 0 }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section label="Vehicle-wise Cost Analysis">
        {vehicles.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
            <Car className="mb-3 h-10 w-10 text-slate-300" />
            <div className="font-display text-lg font-bold text-slate-700">No driven trips yet</div>
            <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">Drive a shared ride to build your vehicle cost breakdown.</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <div key={v.name} className="bento bento-hover">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-display text-base font-bold uppercase text-slate-900">
                    <Car className="h-4 w-4 text-brand-500" />{v.name}
                  </div>
                  <span className="rounded-full bg-gradient-to-b from-[#2dd4bf] to-[#0d9488] px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-white ring-1 ring-black/10">{v.mileage} km/L</span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <MiniStat label="Trips" value={String(v.trips)} />
                  <MiniStat label="Distance" value={`${v.distance.toFixed(1)} km`} />
                  <MiniStat label="Fuel" value={`${v.litres.toFixed(1)} L`} />
                  <MiniStat label="Cost" value={`₹${v.cost.toFixed(0)}`} />
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                    <span>Efficiency</span><span>{v.mileage} km/L</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 ring-1 ring-black/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#a6d6fb] to-[#5aadee]" style={{ width: `${(v.mileage / maxEff) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function Stat({ className = "", tint = "", dark = false, icon, label, value, sub }: {
  className?: string; tint?: string; dark?: boolean; icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  const muted = dark ? "text-[#5c3702]/80" : "text-slate-500";
  const strong = dark ? "text-[#5c3702]" : "text-slate-900";
  const subC = dark ? "text-[#5c3702]/70" : "text-slate-400";
  return (
    <div className={`bento bento-hover ${tint} ${className}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider ${muted}`}>{icon}{label}</div>
      <div className={`mt-1 font-display text-3xl font-bold ${strong}`}>{value}</div>
      {sub && <div className={`mt-0.5 text-[11px] font-bold uppercase tracking-wide ${subC}`}>{sub}</div>}
    </div>
  );
}

function GreenStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/95 p-3 text-slate-900 ring-1 ring-black/10">
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 font-display text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function lastMonths(n: number): { label: string; year: number; month: number }[] {
  const out: { label: string; year: number; month: number }[] = [];
  const now = new Date();
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ label: names[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
  }
  return out;
}

function sameMonth(d: Date, year: number, month: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month;
}
