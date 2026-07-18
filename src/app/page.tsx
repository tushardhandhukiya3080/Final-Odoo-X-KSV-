import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Landing() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="auth-wrap">
      <div className="card" style={{ maxWidth: 480, textAlign: "center" }}>
        <div className="brand-row" style={{ justifyContent: "center" }}>
          <span className="brand-badge">🚗</span>
          <strong style={{ fontSize: "1.4rem" }}>RideShare</strong>
        </div>
        <h1 style={{ fontSize: "1.6rem" }}>Commute together. Spend less.</h1>
        <p className="subtitle">
          The enterprise carpooling platform for your organization. Find a ride,
          offer a seat, track journeys live, and settle up — all in one place.
        </p>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: 8 }}>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
          <Link href="/login" className="btn-ghost" style={{ padding: "11px 18px" }}>
            Log in
          </Link>
        </div>
        <p className="hint" style={{ marginTop: 20 }}>
          🔎 Ride discovery · 🚦 Live tracking · 💳 Wallet &amp; payments · 📊 Reports
        </p>
      </div>
    </div>
  );
}
