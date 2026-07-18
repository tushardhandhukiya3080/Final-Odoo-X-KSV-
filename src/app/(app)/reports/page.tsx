import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

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
    <>
      <div className="page-head">
        <h1>Reports &amp; Analytics</h1>
        <p>Your travel activity and transportation cost insights.</p>
      </div>

      <div className="grid cols-3">
        <Stat icon="🧭" label="Total trips" value={`${rides.length + passengerTrips}`} sub={`${rides.length} driven · ${passengerTrips} taken`} />
        <Stat icon="📏" label="Distance driven" value={`${totalDistance.toFixed(1)} km`} />
        <Stat icon="⛽" label="Fuel consumed" value={`${totalLitres.toFixed(1)} L`} sub={`@ ₹${fuelPrice}/L`} />
        <Stat icon="💰" label="Fuel cost" value={`₹${fuelCost.toFixed(0)}`} />
        <Stat icon="🛣️" label="Cost per km" value={`₹${costPerKm.toFixed(2)}`} sub="org configured" />
        <Stat icon="🧮" label="Est. travel cost" value={`₹${travelCost.toFixed(0)}`} sub={`${totalDistance.toFixed(0)} km × ₹${costPerKm}`} />
      </div>

      <div className="section-title">Monthly distance</div>
      <div className="surface">
        {totalDistance === 0 ? (
          <p className="muted sm">Complete a few trips to see trends.</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 180 }}>
            {monthly.map((m) => (
              <div key={m.label} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height: 140 }}>
                  <div
                    title={`${m.distance.toFixed(1)} km`}
                    style={{
                      width: 34,
                      height: `${(m.distance / maxMonthly) * 100}%`,
                      minHeight: m.distance > 0 ? 4 : 0,
                      background: "linear-gradient(180deg, var(--primary), var(--accent))",
                      borderRadius: "6px 6px 0 0",
                    }}
                  />
                </div>
                <div className="muted sm" style={{ marginTop: 6 }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section-title">Vehicle-wise cost analysis</div>
      {vehicles.length === 0 ? (
        <div className="surface empty">No driven trips yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Trips</th>
                <th>Distance</th>
                <th>Fuel</th>
                <th>Fuel cost</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.name}>
                  <td>{v.name}</td>
                  <td>{v.trips}</td>
                  <td>{v.distance.toFixed(1)} km</td>
                  <td>{v.litres.toFixed(1)} L</td>
                  <td>₹{v.cost.toFixed(0)}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="bar" style={{ width: 80 }}>
                        <div className="bar-fill" style={{ width: `${(v.mileage / maxEff) * 100}%` }} />
                      </div>
                      {v.mileage} km/L
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Stat({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="label">{icon} {label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
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
