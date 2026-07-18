import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { loadUserEco } from "@/lib/eco";
import LiveFeed from "@/components/LiveFeed";

export const dynamic = "force-dynamic";

async function count(sql: string, params: unknown[]): Promise<number> {
  const { rows } = await query<{ n: string }>(sql, params);
  return Number(rows[0]?.n ?? 0);
}

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const uid = user.id;

  const [upcoming, offered, completed, vehicles, nextTrip] = await Promise.all([
    count(
      `SELECT count(*) n FROM bookings b JOIN rides r ON r.id = b.ride_id
       WHERE b.passenger_id = $1 AND b.status = 'booked'
         AND r.status IN ('published','started','in_progress')`,
      [uid],
    ),
    count(
      `SELECT count(*) n FROM rides
       WHERE driver_id = $1 AND status IN ('published','started','in_progress')`,
      [uid],
    ),
    count(
      `SELECT count(*) n FROM bookings WHERE passenger_id = $1 AND status = 'completed'`,
      [uid],
    ),
    count(`SELECT count(*) n FROM vehicles WHERE user_id = $1`, [uid]),
    query<{
      id: string;
      origin_label: string;
      dest_label: string;
      depart_at: Date;
      status: string;
      role: string;
    }>(
      `SELECT r.id, r.origin_label, r.dest_label, r.depart_at, r.status, 'driver' role
         FROM rides r
        WHERE r.driver_id = $1 AND r.status IN ('published','started','in_progress')
      UNION ALL
       SELECT r.id, r.origin_label, r.dest_label, r.depart_at, r.status, 'passenger' role
         FROM bookings b JOIN rides r ON r.id = b.ride_id
        WHERE b.passenger_id = $1 AND b.status = 'booked'
          AND r.status IN ('published','started','in_progress')
        ORDER BY depart_at ASC LIMIT 1`,
      [uid],
    ),
  ]);

  const next = nextTrip.rows[0];

  const orgRow = await query<{ fuel_price_per_litre: string }>(
    "SELECT fuel_price_per_litre FROM organizations WHERE id=$1",
    [user.organizationId],
  );
  const eco = await loadUserEco(uid, Number(orgRow.rows[0]?.fuel_price_per_litre ?? 100));

  return (
    <>
      <div className="page-head">
        <h1>Hi {user.name?.split(" ")[0] ?? "there"} 👋</h1>
        <p>Where are you headed today?</p>
      </div>

      <div className="cta-grid">
        <Link href="/find" className="cta find">
          <span className="ico-lg">🔎</span>
          <span className="big">Find a Ride</span>
          <span className="muted">Search rides matching your route &amp; time</span>
        </Link>
        <Link href="/offer" className="cta offer">
          <span className="ico-lg">🚗</span>
          <span className="big">Offer a Ride</span>
          <span className="muted">Publish a ride and share your seats</span>
        </Link>
      </div>

      <div className="section-title">Overview</div>
      <div className="grid cols-4">
        <div className="stat">
          <div className="label">🧭 Upcoming trips</div>
          <div className="value">{upcoming + offered}</div>
          <div className="sub">{offered} offered · {upcoming} booked</div>
        </div>
        <div className="stat">
          <div className="label">🏁 Completed</div>
          <div className="value">{completed}</div>
          <div className="sub">as passenger</div>
        </div>
        <div className="stat">
          <div className="label">💳 Wallet</div>
          <div className="value">₹{user.walletBalance.toFixed(0)}</div>
          <div className="sub">
            <Link href="/wallet">Recharge →</Link>
          </div>
        </div>
        <div className="stat">
          <div className="label">🚙 Vehicles</div>
          <div className="value">{vehicles}</div>
          <div className="sub">
            <Link href="/vehicles">Manage →</Link>
          </div>
        </div>
      </div>

      <div className="section-title">🌱 Your green impact</div>
      <div className="eco-hero">
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="muted sm">Green score</div>
            <div className="score">{eco.greenScore}</div>
            <div className="muted sm">
              {eco.sharedTrips} shared trip{eco.sharedTrips === 1 ? "" : "s"} · {eco.savedKm} car-km avoided
            </div>
          </div>
          <span style={{ fontSize: "2.6rem" }}>🌍</span>
        </div>
        <div className="grid cols-4" style={{ marginTop: 18 }}>
          <div className="stat eco-tile"><div className="label">💨 CO₂ saved</div><div className="value">{eco.co2Kg} kg</div></div>
          <div className="stat eco-tile"><div className="label">⛽ Fuel saved</div><div className="value">{eco.fuelSavedL} L</div></div>
          <div className="stat eco-tile"><div className="label">💰 Money saved</div><div className="value">₹{eco.moneySaved}</div></div>
          <div className="stat eco-tile"><div className="label">🌳 Trees / yr</div><div className="value">{eco.trees}</div></div>
        </div>
      </div>

      <div className="section-title">Next trip</div>
      {next ? (
        <Link href={`/trips/${next.id}`} className="ride-card" style={{ display: "flex" }}>
          <div className="ride-top">
            <span className={`pill ${next.status}`}>{next.status.replace("_", " ")}</span>
            <span className="pill">{next.role}</span>
            <div className="spacer" style={{ flex: 1 }} />
            <span className="muted sm">{new Date(next.depart_at).toLocaleString()}</span>
          </div>
          <div className="ride-route">
            <span>{next.origin_label.split(",")[0]}</span>
            <span className="arrow">→</span>
            <span>{next.dest_label.split(",")[0]}</span>
          </div>
        </Link>
      ) : (
        <div className="surface empty">
          <span className="big-ico">🗺️</span>
          No upcoming trips. <Link href="/find">Find a ride</Link> or{" "}
          <Link href="/offer">offer one</Link>.
        </div>
      )}

      <div className="section-title">Live activity</div>
      <LiveFeed />
    </>
  );
}
