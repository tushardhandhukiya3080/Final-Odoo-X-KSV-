import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  PlusCircle,
  Route,
  Wallet,
  Car,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  Users,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { disconnectSocket } from "../lib/socket";

const empNav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/find", label: "Find a Ride", icon: Search },
  { to: "/app/offer", label: "Offer a Ride", icon: PlusCircle },
  { to: "/app/trips", label: "My Trips", icon: Route },
  { to: "/app/wallet", label: "Wallet", icon: Wallet },
  { to: "/app/vehicles", label: "My Vehicles", icon: Car },
  { to: "/app/reports", label: "My Impact", icon: BarChart3 },
];

const adminNav = [
  { to: "/app/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/admin/employees", label: "Employees", icon: Users },
  { to: "/app/admin/vehicles", label: "Fleet", icon: Car },
  { to: "/app/admin/reports", label: "Analytics", icon: BarChart3 },
  { to: "/app/admin/settings", label: "Org Settings", icon: Settings },
];

export default function Layout() {
  const { user, org, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "COMPANY_ADMIN";
  const nav = isAdmin ? adminNav : empNav;

  function onLogout() {
    disconnectSocket();
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — transparent so the ambient background flows through (no seam) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-black/10 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-1">
          <div className="grid h-10 w-10 place-items-center ring-1 ring-black/10 bg-brand-500 text-white shadow-brutal-sm">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-base font-bold uppercase tracking-tight text-black">CommuteShare</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-black/50">Enterprise Carpooling</div>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 ring-1 ring-black/10 bg-pop-yellow px-3 py-2 shadow-brutal-sm">
          <Building2 className="h-4 w-4 text-black" />
          <div className="truncate">
            <div className="truncate text-xs font-extrabold uppercase text-black">{org?.name}</div>
            <div className="text-[11px] font-semibold text-black/60">{org?.domain}</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={(n as any).end}
              className={({ isActive }) =>
                `flex items-center gap-3 border-[3px] px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-all duration-100 ${
                  isActive
                    ? "border-black bg-brand-400 text-black shadow-brutal-sm"
                    : "border-transparent text-black/70 hover:border-black hover:bg-slate-100 hover:text-black"
                }`
              }
            >
              <n.icon className="h-[18px] w-[18px]" />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-black/10 pt-3">
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="grid h-10 w-10 place-items-center ring-1 ring-black/10 bg-brand-100 text-sm font-extrabold text-black">
              {user?.name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-black">{user?.name}</div>
              <div className="truncate text-[10px] font-bold uppercase tracking-wider text-black/50">
                {isAdmin ? "Company Admin" : "Employee"}
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="mt-1 flex w-full items-center gap-3 ring-1 ring-black/10 bg-white px-3 py-2.5 text-sm font-extrabold uppercase text-rose-600 shadow-brutal-sm transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-rose-600 hover:text-white active:translate-x-0 active:translate-y-0 active:shadow-none">
            <LogOut className="h-[18px] w-[18px]" /> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center ring-1 ring-black/10 bg-brand-500 text-white">
              <Car className="h-4 w-4" />
            </div>
            <span className="font-display font-bold uppercase">CommuteShare</span>
          </div>
          <button onClick={onLogout} className="ring-1 ring-black/10 bg-white p-1.5 text-rose-600 shadow-brutal-sm"><LogOut className="h-5 w-5" /></button>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-4 md:p-8">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="flex items-center justify-around border-t border-black/10 py-1.5 md:hidden">
          {nav.slice(0, 5).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={(n as any).end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 border-2 px-3 py-1 text-[10px] font-bold uppercase ${
                  isActive ? "border-black bg-brand-400 text-black" : "border-transparent text-black/40"
                }`
              }
            >
              <n.icon className="h-5 w-5" />
              {n.label.split(" ")[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
