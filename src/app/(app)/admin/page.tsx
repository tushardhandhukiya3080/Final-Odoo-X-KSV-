import { redirect } from "next/navigation";
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

  return (
    <>
      <div className="page-head">
        <h1>Admin Console</h1>
        <p>Configure your organization and monitor participation.</p>
      </div>

      <div className="grid cols-4">
        <div className="stat"><div className="label">👥 Employees</div><div className="value">{emp.length}</div></div>
        <div className="stat"><div className="label">🚙 Vehicles</div><div className="value">{vehicles}</div></div>
        <div className="stat"><div className="label">🚗 Rides</div><div className="value">{rides}</div><div className="sub">{completed} completed</div></div>
        <div className="stat"><div className="label">📈 Participation</div><div className="value">{emp.length ? Math.round((participants / emp.length) * 100) : 0}%</div><div className="sub">{participants} active</div></div>
      </div>

      <div className="section-title">Configuration</div>
      <OrgConfigForm />

      <div className="section-title">Employees</div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Wallet</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {emp.map((e) => (
              <tr key={e.id}>
                <td>{e.name ?? "—"}</td>
                <td>{e.email}</td>
                <td><span className={`pill ${e.role}`}>{e.role}</span></td>
                <td>{e.phone ?? "—"}</td>
                <td>₹{Number(e.wallet_balance).toFixed(0)}</td>
                <td>{new Date(e.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
