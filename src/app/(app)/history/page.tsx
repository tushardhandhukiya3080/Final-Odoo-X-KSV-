import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface HistRow {
  id: string;
  origin_label: string;
  dest_label: string;
  depart_at: Date;
  distance_km: number;
  status: string;
  vehicle: string;
  participants: string;
  role: string;
}

export default async function HistoryPage() {
  const user = (await getCurrentUser())!;

  const { rows } = await query<HistRow>(
    `SELECT r.id, r.origin_label, r.dest_label, r.depart_at, r.distance_km, r.status,
            v.model || ' · ' || v.registration_number vehicle,
            'You (driver)' participants, 'driver' role
       FROM rides r JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.driver_id = $1 AND r.status = 'completed'
     UNION ALL
     SELECT r.id, r.origin_label, r.dest_label, r.depart_at, r.distance_km, r.status,
            v.model || ' · ' || v.registration_number vehicle,
            COALESCE(du.name, 'Driver') participants, 'passenger' role
       FROM bookings b
       JOIN rides r ON r.id = b.ride_id
       JOIN vehicles v ON v.id = r.vehicle_id
       JOIN users du ON du.id = r.driver_id
      WHERE b.passenger_id = $1 AND b.status = 'completed'
      ORDER BY depart_at DESC`,
    [user.id],
  );

  return (
    <>
      <div className="page-head">
        <h1>Ride History</h1>
        <p>Every completed trip you&apos;ve driven or taken.</p>
      </div>

      {rows.length === 0 ? (
        <div className="surface empty">
          <span className="big-ico">🕘</span>
          No completed trips yet.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Route</th>
                <th>Role</th>
                <th>With</th>
                <th>Vehicle</th>
                <th>Distance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.role}-${r.id}`}>
                  <td>{new Date(r.depart_at).toLocaleDateString()}</td>
                  <td>
                    {r.origin_label.split(",")[0]} → {r.dest_label.split(",")[0]}
                  </td>
                  <td><span className="pill">{r.role}</span></td>
                  <td>{r.participants}</td>
                  <td>{r.vehicle}</td>
                  <td>{Number(r.distance_km)} km</td>
                  <td><Link href={`/trips/${r.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
