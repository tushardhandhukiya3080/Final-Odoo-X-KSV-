import type { ReactNode } from "react";
import type { TripStatus } from "../lib/types";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" width="18" height="18">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function Stat({
  label,
  value,
  sub,
  icon,
  accent = "brand",
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: "brand" | "blue" | "amber" | "violet";
  className?: string;
}) {
  const iconBg = {
    brand: "text-white bg-gradient-to-b from-brand-400 to-brand-600",
    blue: "text-white bg-gradient-to-b from-sky-400 to-sky-600",
    amber: "text-white bg-gradient-to-b from-amber-400 to-amber-600",
    violet: "text-white bg-gradient-to-b from-indigo-400 to-indigo-600",
  }[accent];
  return (
    <div className={`bento bento-hover animate-fade-in ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
          <div className="mt-1.5 font-display text-3xl font-bold tracking-tight text-slate-800">{value}</div>
          {sub && <div className="mt-0.5 text-xs font-semibold text-slate-400">{sub}</div>}
        </div>
        {icon && <div className={`grid h-11 w-11 place-items-center rounded-xl shadow-sm ring-1 ring-black/10 ${iconBg}`}>{icon}</div>}
      </div>
    </div>
  );
}

const TRIP_META: Record<TripStatus, { label: string; cls: string }> = {
  RIDE_BOOKED: { label: "Booked", cls: "bg-gradient-to-b from-slate-100 to-slate-200 text-slate-600" },
  TRIP_STARTED: { label: "Started", cls: "bg-gradient-to-b from-sky-300 to-sky-500 text-white" },
  TRIP_IN_PROGRESS: { label: "In Progress", cls: "bg-gradient-to-b from-indigo-300 to-indigo-500 text-white animate-pulse" },
  TRIP_COMPLETED: { label: "Completed", cls: "bg-gradient-to-b from-teal-300 to-teal-500 text-white" },
  PAYMENT_PENDING: { label: "Payment Pending", cls: "bg-gradient-to-b from-amber-300 to-amber-500 text-white" },
  PAYMENT_COMPLETED: { label: "Paid", cls: "bg-gradient-to-b from-brand-400 to-brand-600 text-white" },
};

export function StatusBadge({ status }: { status: TripStatus }) {
  const m = TRIP_META[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-sm ring-1 ring-black/10 ${m.cls}`}>{m.label}</span>;
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-sm ring-1 ring-black/10 ${className}`}>{children}</span>;
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <div className="font-display text-lg font-bold text-slate-700">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">{hint}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
