import { redirect } from "next/navigation";
import {
  Users, Car, Route as RouteIcon, TrendingUp, Building2, Shield, SlidersHorizontal,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import OrgConfigForm from "@/components/admin/OrgConfigForm";

export const dynamic = "force-dynamic";

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
