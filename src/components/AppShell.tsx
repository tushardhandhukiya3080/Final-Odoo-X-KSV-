"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Search, PlusCircle, Route, Wallet, Car, BarChart3,
  Settings, LogOut, Building2, MapPin, Clock, Gamepad2, ShieldCheck, Menu, Radar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CurrentUser } from "@/lib/types";
import { useAppEvents } from "@/components/EventsProvider";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  admin?: boolean;
}

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/find", label: "Find a Ride", Icon: Search },
  { href: "/offer", label: "Offer a Ride", Icon: PlusCircle },
  { href: "/live", label: "Live Map", Icon: Radar },
  { href: "/trips", label: "My Trips", Icon: Route },
  { href: "/simulate", label: "Simulate", Icon: Gamepad2 },
];
const MANAGE: NavItem[] = [
  { href: "/vehicles", label: "My Vehicles", Icon: Car },
  { href: "/places", label: "Saved Places", Icon: MapPin },
  { href: "/wallet", label: "Wallet", Icon: Wallet },
  { href: "/history", label: "Ride History", Icon: Clock },
  { href: "/reports", label: "My Impact", Icon: BarChart3 },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/admin", label: "Admin Console", Icon: ShieldCheck, admin: true },
];

const NOTIF: Record<string, string> = {
  "ride.booked": "🎫 A seat was just booked on your ride",
  "trip.started": "🚦 A trip has started — track it live",
  "trip.completed": "🏁 Trip completed",
  "payment.completed": "✅ Payment received",
  "wallet.recharged": "💰 Wallet recharged",
  "ride.cancelled": "⚠️ A ride was cancelled",
  sos: "🆘 SOS alert — a rider needs help",
};

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

export default function AppShell({
  user,
  org,
  children,
}: {
  user: CurrentUser;
  org: { name: string; domain: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  useAppEvents((ev) => {
    const msg = NOTIF[ev.type];
    if (!msg) return;
    const kind = ev.type === "sos" || ev.type === "ride.cancelled" ? "err" : "ok";
    setToast({ text: (ev.data?.message as string) ?? msg, kind });
    setTimeout(() => setToast(null), 4500);
  });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const items = MANAGE.filter((i) => !i.admin || user.role === "admin");
  const initials = (user.name ?? user.email).slice(0, 1).toUpperCase();

  const NavRow = ({ item }: { item: NavItem }) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-all duration-100 ${
          active
            ? "bg-brand-500 text-white shadow-btn ring-1 ring-brand-700/40"
            : "text-slate-500 hover:bg-brand-500/10 hover:text-brand-800"
        }`}
      >
        <item.Icon className="h-[18px] w-[18px]" />
        {item.label}
      </Link>
    );
  };

  const Sidebar = (
    <>
      {/* Brand */}
      <div className="mb-5 flex items-center gap-2 px-1">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-btn ring-1 ring-black/10">
          <Car className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-base font-bold uppercase tracking-tight text-slate-800">RideShare</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enterprise Carpooling</div>
        </div>
      </div>

      {/* Org chip */}
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#fcd775] to-[#efab24] px-3 py-2 shadow-raised ring-1 ring-black/10">
        <Building2 className="h-4 w-4 shrink-0 text-[#7c4a03]" />
        <div className="min-w-0">
          <div className="truncate text-xs font-extrabold uppercase text-[#5c3702]">{org.name}</div>
          {org.domain && <div className="truncate text-[11px] font-semibold text-[#7c4a03]/70">{org.domain}</div>}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {PRIMARY.map((i) => <NavRow key={i.href} item={i} />)}
        <div className="mt-3 mb-1 px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Manage</div>
        {items.map((i) => <NavRow key={i.href} item={i} />)}
      </nav>

      {/* User + logout */}
      <div className="mt-4 border-t border-black/10 pt-3">
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-brand-300 to-brand-500 text-sm font-extrabold text-white shadow-btn ring-1 ring-black/10">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-extrabold text-slate-800">{user.name ?? user.email}</div>
            <div className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {user.role === "admin" ? "Company Admin" : "Employee"}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-extrabold uppercase text-rose-600 shadow-btn ring-1 ring-black/10 transition-all hover:bg-rose-600 hover:text-white active:translate-y-px"
        >
          <LogOut className="h-[18px] w-[18px]" /> Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-black/10 bg-white/50 p-4 backdrop-blur-md md:flex">
        {Sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && <div className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-black/10 bg-cream-50 p-4 transition-transform md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {Sidebar}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/10 bg-cream-50/80 px-4 py-3 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 text-white ring-1 ring-black/10">
              <Car className="h-4 w-4" />
            </div>
            <span className="font-display font-bold uppercase text-slate-800">RideShare</span>
          </div>
          <button onClick={() => setOpen(true)} className="rounded-lg bg-white p-2 text-slate-700 shadow-btn ring-1 ring-black/10" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
        </main>
      </div>

      {toast && (
        <div className={`toast ${toast.kind}`}>{toast.text}</div>
      )}
    </div>
  );
}
