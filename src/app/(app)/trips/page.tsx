import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TripRow {
  id: string;
  origin_label: string;
  dest_label: string;
  depart_at: Date;
  status: string;
  extra: string;
  pay?: string | null;
}

function short(label: string): string {
  return label.split(",")[0];
}

export default async function TripsPage() {
  const user = (await getCurrentUser())!;

  const driver = await query<TripRow>(
    `SELECT id, origin_label, dest_label, depart_at, status,
            (seats_total - seats_available) || '/' || seats_total || ' seats booked' extra
       FROM rides
      WHERE driver_id = $1 AND status <> 'cancelled'
      ORDER BY depart_at DESC`,
    [user.id],
  );

  const passenger = await query<TripRow>(
    `SELECT r.id, r.origin_label, r.dest_label, r.depart_at, r.status,
            b.seats || ' seat(s) · ₹' || b.fare_amount extra, b.payment_status pay
       FROM bookings b JOIN rides r ON r.id = b.ride_id
      WHERE b.passenger_id = $1 AND b.status <> 'cancelled'
      ORDER BY r.depart_at DESC`,
    [user.id],
  );

  return (
    <>
      <div className="page-head">
        <h1>My Trips</h1>
        <p>Rides you&apos;re driving and rides you&apos;ve booked.</p>
      </div>

      <div className="section-title">🚗 As driver ({driver.rows.length})</div>
      {driver.rows.length === 0 ? (
        <div className="surface empty">
          No rides offered. <Link href="/offer">Offer a ride →</Link>
        </div>
      ) : (
        <div className="grid cols-2">
          {driver.rows.map((t) => (
            <TripCard key={t.id} t={t} role="driver" />
          ))}
        </div>
      )}

      <div className="section-title">🧑‍🤝‍🧑 As passenger ({passenger.rows.length})</div>
      {passenger.rows.length === 0 ? (
        <div className="surface empty">
          No booked rides. <Link href="/find">Find a ride →</Link>
        </div>
      ) : (
        <div className="grid cols-2">
          {passenger.rows.map((t) => (
            <TripCard key={t.id} t={t} role="passenger" />
          ))}
        </div>
      )}
    </>
  );
}

function TripCard({ t, role }: { t: TripRow; role: "driver" | "passenger" }) {
  const needsPay = role === "passenger" && t.status === "completed" && t.pay === "pending";
  return (
    <Link href={`/trips/${t.id}`} className="ride-card" style={{ display: "flex" }}>
      <div className="ride-top">
        <span className={`pill ${t.status}`}>{t.status.replace("_", " ")}</span>
        {needsPay && <span className="pill pending">payment due</span>}
        <div style={{ flex: 1 }} />
        <span className="muted sm">{new Date(t.depart_at).toLocaleString()}</span>
      </div>
      <div className="ride-route">
        <span>{short(t.origin_label)}</span>
        <span className="arrow">→</span>
        <span>{short(t.dest_label)}</span>
      </div>
      <div className="ride-meta">
        <span>{t.extra}</span>
      </div>
    </Link>
  );
}
