import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import ProfilePhone from "@/components/ProfilePhone";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/trips", icon: "🧭", label: "My Trips", sub: "Active & upcoming rides" },
  { href: "/vehicles", icon: "🚙", label: "My Vehicles", sub: "Register & manage cars" },
  { href: "/wallet", icon: "💳", label: "Payment & Wallet", sub: "Balance & methods" },
  { href: "/history", icon: "🕘", label: "Ride History", sub: "Completed trips" },
  { href: "/places", icon: "📍", label: "Saved Places", sub: "Home, Office & more" },
  { href: "/reports", icon: "📊", label: "Reports", sub: "Cost & travel insights" },
];

export default async function SettingsPage() {
  const user = (await getCurrentUser())!;
  const org = await query<{ name: string }>("SELECT name FROM organizations WHERE id=$1", [
    user.organizationId,
  ]);

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
        <p>Quick access to everything in your account.</p>
      </div>

      <div className="surface" style={{ marginBottom: 20 }}>
        <div className="panel" style={{ border: "none", padding: 0 }}>
          <div className="row"><span className="k">Name</span><span>{user.name ?? "—"}</span></div>
          <div className="row"><span className="k">Email</span><span>{user.email}</span></div>
          <div className="row"><span className="k">Phone</span><span>{user.phone ?? "—"}</span></div>
          <div className="row"><span className="k">Company</span><span>{org.rows[0]?.name ?? "—"}</span></div>
          <div className="row"><span className="k">Role</span><span><span className={`pill ${user.role}`}>{user.role}</span></span></div>
        </div>
      </div>

      <ProfilePhone initialPhone={user.phone} />

      <a className="surface" href="/whatsapp/login" target="_blank" rel="noreferrer"
         style={{ display: "block", marginBottom: 20, textDecoration: "none" }}>
        <div className="row-between">
          <div>
            <strong>💬 Connect WhatsApp (for invoices)</strong>
            <div className="muted sm" style={{ marginTop: 4 }}>
              Scan the QR once to link the number that sends receipts. Opens in a new tab →
            </div>
          </div>
          <span className="pill">setup</span>
        </div>
      </a>

      <div className="nav-cards">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="nav-card">
            <strong>{l.icon} {l.label}</strong>
            <span className="muted sm">{l.sub}</span>
          </Link>
        ))}
        {user.role === "admin" && (
          <Link href="/admin" className="nav-card">
            <strong>🛡️ Admin Console</strong>
            <span className="muted sm">Company configuration</span>
          </Link>
        )}
        <a className="nav-card" href="mailto:support@rideshare.example">
          <strong>❓ Help &amp; Support</strong>
          <span className="muted sm">Contact us</span>
        </a>
      </div>
    </>
  );
}
