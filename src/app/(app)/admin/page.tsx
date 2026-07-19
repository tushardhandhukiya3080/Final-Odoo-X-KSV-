import { redirect } from "next/navigation";
import {
  Users, Car, Bike, Route as RouteIcon, TrendingUp, Building2, Shield,
  SlidersHorizontal, Fuel, ShieldCheck,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import OrgConfigForm from "@/components/admin/OrgConfigForm";

export const dynamic = "force-dynamic";

interface FleetRow {
  id: string;
  model: string;
  registration_number: string;
  vehicle_type: string;
  seating_capacity: number;
  fuel_type: string;
  mileage_kmpl: number;
  is_active: boolean;
  plate_verified: boolean;
  owner_name: string | null;
}
interface RideRow {
  id: string;
  origin_label: string;
  dest_label: string;
  stops: { label: string }[] | null;
  status: string;
  track_mode: string;
  distance_km: number;
  seats_total: number;
  seats_available: number;
  fare_per_seat: number;
  depart_at: Date;
  driver_name: string | null;
  vehicle_model: string;
  registration_number: string;
}

async function count(sql: string, params: unknown[]): Promise<number> {
  const { rows } = await query<{ n: string }>(sql, params);
  return Number(rows[0]?.n ?? 0);
}

export default async function AdminPage() {
  const user = (await getCurrentUser())!;
  if (user.role !== "admin") redirect("/dashboard");
  const org = user.organizationId;

  const [employees, vehicles, rides, completed, participants] = await Promise.all([
    query<{
      id: string;
      name: string | null;
      email: string;
      role: string;
      phone: string | null;
      wallet_balance: string;
      created_at: Date;
    }>(
      `SELECT id, name, email, role, phone, wallet_balance, created_at
         FROM users WHERE organization_id=$1 ORDER BY created_at`,
      [org],
    ),
    count("SELECT count(*) n FROM vehicles v JOIN users u ON u.id=v.user_id WHERE u.organization_id=$1", [org]),
    count("SELECT count(*) n FROM rides WHERE organization_id=$1", [org]),
    count("SELECT count(*) n FROM rides WHERE organization_id=$1 AND status='completed'", [org]),
    count(
      `SELECT count(DISTINCT uid) n FROM (
         SELECT driver_id uid FROM rides WHERE organization_id=$1
         UNION
         SELECT b.passenger_id FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE r.organization_id=$1
       ) t`,
      [org],
    ),
  ]);

  // Full fleet + every route ever held in this org (admin-only, org-scoped).
  const fleet = await query<FleetRow>(
    `SELECT v.id, v.model, v.registration_number, v.vehicle_type, v.seating_capacity,
            v.fuel_type, v.mileage_kmpl, v.is_active, v.plate_verified, u.name owner_name
       FROM vehicles v JOIN users u ON u.id = v.user_id
      WHERE u.organization_id = $1
      ORDER BY v.created_at DESC`,
    [org],
  );
  const rideRecords = await query<RideRow>(
    `SELECT r.id, r.origin_label, r.dest_label, r.stops, r.status, r.track_mode,
            r.distance_km, r.seats_total, r.seats_available, r.fare_per_seat, r.depart_at,
            u.name driver_name, v.model vehicle_model, v.registration_number
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.organization_id = $1
      ORDER BY r.depart_at DESC
      LIMIT 200`,
    [org],
  );

  const emp = employees.rows;
  const participationPct = emp.length ? Math.round((participants / emp.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#8a95f0] to-[#5560d8] text-white shadow-btn ring-1 ring-black/10">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-slate-900">Admin Console</h1>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
            <Shield className="h-3.5 w-3.5" /> Configure your organization and monitor participation.
          </p>
        </div>
      </div>

      <Section label="Overview">
        <div className="bento-grid">
          <StatTile className="lg:col-span-3" icon={<Users className="h-4 w-4" />} label="Employees" value={emp.length} />
          <StatTile className="lg:col-span-3" icon={<Car className="h-4 w-4" />} label="Vehicles" value={vehicles} />
          <StatTile className="lg:col-span-3" tint="from-[#ccfaf3] to-[#7fe6d6]" icon={<RouteIcon className="h-4 w-4" />} label="Rides" value={rides} sub={`${completed} completed`} />
          <StatTile className="lg:col-span-3" tint="from-[#a6d6fb] to-[#5aadee]" icon={<TrendingUp className="h-4 w-4" />} label="Participation" value={`${participationPct}%`} sub={`${participants} active`} />
        </div>
      </Section>

      <Section label="Configuration">
        <OrgConfigForm />
      </Section>

      <Section label="Employees">
        {emp.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
            <Users className="mb-3 h-10 w-10 text-slate-300" />
            <div className="font-display text-lg font-bold text-slate-700">No employees yet</div>
            <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">Invite your team to start sharing rides.</div>
          </div>
        ) : (
          <div className="bento">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <SlidersHorizontal className="h-4 w-4 text-brand-500" /> Team roster
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3 text-right">Wallet</th>
                    <th className="py-2 text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emp.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">{e.name ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-medium text-slate-600">{e.email}</td>
                      <td className="py-2.5 pr-3"><RoleBadge role={e.role} /></td>
                      <td className="py-2.5 pr-3 font-medium text-slate-600">{e.phone ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-slate-900">₹{Number(e.wallet_balance).toFixed(0)}</td>
                      <td className="py-2.5 text-right font-medium text-slate-500">{new Date(e.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      <Section label={`Fleet · ${fleet.rows.length} vehicle${fleet.rows.length === 1 ? "" : "s"}`}>
        {fleet.rows.length === 0 ? (
          <EmptyTile icon={<Car className="mb-3 h-10 w-10 text-slate-300" />} title="No vehicles registered" hint="Employees register vehicles before offering rides." />
        ) : (
          <div className="bento">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-2 pr-3">Vehicle</th>
                    <th className="py-2 pr-3">Plate</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Owner</th>
                    <th className="py-2 pr-3">Fuel</th>
                    <th className="py-2 pr-3 text-right">Seats</th>
                    <th className="py-2 pr-3 text-right">km/L</th>
                    <th className="py-2 text-right">RC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fleet.rows.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">
                        <span className="inline-flex items-center gap-1.5">{v.vehicle_type === "bike" ? <Bike className="h-3.5 w-3.5 text-brand-500" /> : <Car className="h-3.5 w-3.5 text-brand-500" />}{v.model}</span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs font-bold uppercase text-slate-600">{v.registration_number}</td>
                      <td className="py-2.5 pr-3 capitalize text-slate-600">{v.vehicle_type}</td>
                      <td className="py-2.5 pr-3 font-medium text-slate-600">{v.owner_name ?? "—"}</td>
                      <td className="py-2.5 pr-3"><span className="inline-flex items-center gap-1 text-slate-500"><Fuel className="h-3 w-3" />{v.fuel_type.toUpperCase()}</span></td>
                      <td className="py-2.5 pr-3 text-right text-slate-700">{v.seating_capacity}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-700">{v.mileage_kmpl}</td>
                      <td className="py-2.5 text-right">
                        {v.plate_verified
                          ? <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold uppercase text-teal-600"><ShieldCheck className="h-3.5 w-3.5" />verified</span>
                          : <span className="text-[11px] font-bold uppercase text-slate-300">unverified</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      <Section label={`Ride Records · ${rideRecords.rows.length} route${rideRecords.rows.length === 1 ? "" : "s"}`}>
        {rideRecords.rows.length === 0 ? (
          <EmptyTile icon={<RouteIcon className="mb-3 h-10 w-10 text-slate-300" />} title="No rides yet" hint="Every route offered in your org is logged here." />
        ) : (
          <div className="bento">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-2 pr-3">Route</th>
                    <th className="py-2 pr-3">Driver</th>
                    <th className="py-2 pr-3">Vehicle</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Dist</th>
                    <th className="py-2 pr-3 text-right">Seats</th>
                    <th className="py-2 pr-3 text-right">Fare</th>
                    <th className="py-2 pr-3">Mode</th>
                    <th className="py-2 text-right">Departs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rideRecords.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-3 font-semibold text-slate-900"><span className="whitespace-nowrap">{routeChain(r.origin_label, r.stops, r.dest_label)}</span></td>
                      <td className="py-2.5 pr-3 font-medium text-slate-600">{r.driver_name ?? "—"}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600">{r.vehicle_model} · {r.registration_number}</td>
                      <td className="py-2.5 pr-3"><StatusPill status={r.status} /></td>
                      <td className="py-2.5 pr-3 text-right text-slate-700">{Number(r.distance_km).toFixed(1)} km</td>
                      <td className="py-2.5 pr-3 text-right text-slate-700">{r.seats_available}/{r.seats_total}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-slate-900">₹{Number(r.fare_per_seat)}</td>
                      <td className="py-2.5 pr-3 text-[11px] font-bold uppercase text-slate-500">{r.track_mode}</td>
                      <td className="py-2.5 text-right whitespace-nowrap font-medium text-slate-500">{new Date(r.depart_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function EmptyTile({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
      {icon}
      <div className="font-display text-lg font-bold text-slate-700">{title}</div>
      <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">{hint}</div>
    </div>
  );
}

function routeChain(origin: string, stops: { label: string }[] | null, dest: string): string {
  const mid = (Array.isArray(stops) ? stops : []).map((s) => s.label.split(",")[0]);
  return [origin.split(",")[0], ...mid, dest.split(",")[0]].join("  →  ");
}

function StatusPill({ status }: { status: string }) {
  const tint: Record<string, string> = {
    published: "from-[#a6d6fb] to-[#5aadee] text-white",
    started: "from-[#fcd775] to-[#efab24] text-[#5c3702]",
    in_progress: "from-[#fcd775] to-[#efab24] text-[#5c3702]",
    completed: "from-[#2dd4bf] to-[#0d9488] text-white",
    cancelled: "from-[#fb7185] to-[#e11d48] text-white",
  };
  return (
    <span className={`whitespace-nowrap rounded-full bg-gradient-to-b px-2.5 py-0.5 text-[11px] font-extrabold uppercase ring-1 ring-black/10 ${tint[status] ?? "from-slate-200 to-slate-300 text-slate-600"}`}>
      {status.replace("_", " ")}
    </span>
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

function StatTile({ className = "", tint, icon, label, value, sub }: {
  className?: string; tint?: string; icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string;
}) {
  return (
    <div className={`bento bento-hover ${tint ? `bg-gradient-to-b ${tint}` : ""} ${className}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{icon}{label}</div>
      <div className="mt-1 font-display text-3xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{sub}</div>}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const tint = role === "admin"
    ? "bg-gradient-to-b from-[#8a95f0] to-[#5560d8] text-white"
    : "bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] text-white";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ring-1 ring-black/10 ${tint}`}>{role}</span>
  );
}
