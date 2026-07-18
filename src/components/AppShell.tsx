"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { CurrentUser } from "@/lib/types";
import { useAppEvents } from "@/components/EventsProvider";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  admin?: boolean;
}

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/find", label: "Find a Ride", icon: "🔎" },
  { href: "/offer", label: "Offer a Ride", icon: "🚗" },
  { href: "/trips", label: "My Trips", icon: "🧭" },
  { href: "/simulate", label: "Simulate", icon: "🎮" },
];
const MANAGE: NavItem[] = [
  { href: "/vehicles", label: "Vehicles", icon: "🚙" },
  { href: "/places", label: "Saved Places", icon: "📍" },
  { href: "/wallet", label: "Wallet", icon: "💳" },
  { href: "/history", label: "Ride History", icon: "🕘" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/admin", label: "Admin Console", icon: "🛡️", admin: true },
];

function titleFor(pathname: string): string {
  const all = [...PRIMARY, ...MANAGE];
  const hit = all.find((i) => pathname.startsWith(i.href));
  return hit?.label ?? "RideShare";
}

export default function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wallet, setWallet] = useState(user.walletBalance);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Global ride notifications via the shared SSE stream.
  useAppEvents((ev) => {
    const msg = NOTIF[ev.type];
    if (!msg) return;
    const kind = ev.type === "sos" || ev.type === "ride.cancelled" ? "err" : "ok";
    setToast({ text: (ev.data?.message as string) ?? msg, kind });
    setTimeout(() => setToast(null), 4500);
    if (ev.type === "payment.completed" || ev.type === "wallet.recharged") {
      refreshWallet();
    }
  });

  async function refreshWallet() {
    try {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      if (json.success) setWallet(json.data.balance);
    } catch {
      /* ignore */
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();
  const items = MANAGE.filter((i) => !i.admin || user.role === "admin");

  return (
    <div className="shell">
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="logo">
          <span className="brand-badge">🚗</span> RideShare
        </div>
        {PRIMARY.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`nav-link ${pathname.startsWith(i.href) ? "active" : ""}`}
          >
            <span className="ico">{i.icon}</span> {i.label}
          </Link>
        ))}
        <div className="nav-sep">Manage</div>
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`nav-link ${pathname.startsWith(i.href) ? "active" : ""}`}
          >
            <span className="ico">{i.icon}</span> {i.label}
          </Link>
        ))}
        <div className="spacer" />
        <button className="nav-link" onClick={logout} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
          <span className="ico">🚪</span> Log out
        </button>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            ☰
          </button>
          <span className="title">{titleFor(pathname)}</span>
          <div className="spacer" />
          <Link href="/wallet" className="wallet-chip">
            💳 ₹{wallet.toFixed(2)}
          </Link>
          <span className="user-chip">
            <span className="avatar">{initials}</span>
            <span className="muted sm">{user.role === "admin" ? "Admin" : "Employee"}</span>
          </span>
        </header>
        <main className="content">{children}</main>
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}

const NOTIF: Record<string, string> = {
  "ride.booked": "🎫 A seat was just booked on your ride",
  "trip.started": "🚦 A trip has started — track it live",
  "trip.completed": "🏁 Trip completed",
  "payment.completed": "✅ Payment received",
  "wallet.recharged": "💰 Wallet recharged",
  "ride.cancelled": "⚠️ A ride was cancelled",
  sos: "🆘 SOS alert — a rider needs help",
};
