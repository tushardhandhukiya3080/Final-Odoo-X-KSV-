import Link from "next/link";
import { Car, Users, Route as RouteIcon, ArrowRight } from "lucide-react";
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

function statusTint(status: string): string {
  if (status === "completed") return "bg-gradient-to-b from-[#2dd4bf] to-[#0d9488] text-white";
  if (status === "cancelled") return "bg-gradient-to-b from-[#fb7185] to-[#e11d48] text-white";
  if (status === "started" || status === "in_progress")
    return "bg-gradient-to-b from-[#fcd775] to-[#efab24] text-[#5c3702]";
  return "bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] text-white";
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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase text-slate-900">My Trips</h1>
        <p className="text-sm font-semibold text-slate-500">
          Rides you&apos;re driving and rides you&apos;ve booked.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">
          <Car className="h-4 w-4" /> As driver ({driver.rows.length})
        </div>
        {driver.rows.length === 0 ? (
          <EmptyTile href="/offer" title="No rides offered" cta="Offer a ride →" />
        ) : (
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
            {driver.rows.map((t) => (
              <TripCard key={t.id} t={t} role="driver" />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">
          <Users className="h-4 w-4" /> As passenger ({passenger.rows.length})
        </div>
        {passenger.rows.length === 0 ? (
          <EmptyTile href="/find" title="No booked rides" cta="Find a ride →" />
        ) : (
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
            {passenger.rows.map((t) => (
              <TripCard key={t.id} t={t} role="passenger" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TripCard({ t, role }: { t: TripRow; role: "driver" | "passenger" }) {
  const needsPay = role === "passenger" && t.status === "completed" && t.pay === "pending";
  return (
    <Link href={`/trips/${t.id}`} className="bento bento-hover block">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-white ring-1 ring-black/10 ${role === "driver" ? "bg-gradient-to-b from-[#a6d6fb] to-[#5aadee]" : "bg-gradient-to-b from-[#8a95f0] to-[#5560d8]"}`}
          >
            {role}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ring-1 ring-black/10 ${statusTint(t.status)}`}
          >
            {t.status.replace("_", " ")}
          </span>
          {needsPay && (
            <span className="rounded-full bg-gradient-to-b from-[#fcd775] to-[#efab24] px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-[#5c3702] ring-1 ring-black/10">
              payment due
            </span>
          )}
        </div>
        <span className="text-xs font-bold text-slate-400">{new Date(t.depart_at).toLocaleString()}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 font-display text-lg font-bold uppercase text-slate-900">
        {short(t.origin_label)} <ArrowRight className="h-5 w-5 shrink-0 text-brand-500" /> {short(t.dest_label)}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
        <Users className="h-4 w-4 text-slate-400" /> {t.extra}
      </div>
    </Link>
  );
}

function EmptyTile({ href, title, cta }: { href: string; title: string; cta: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
      <RouteIcon className="mb-3 h-10 w-10 text-slate-300" />
      <div className="font-display text-lg font-bold text-slate-700">{title}</div>
      <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">
        <Link href={href} className="font-bold text-brand-600 underline">
          {cta}
        </Link>
      </div>
    </div>
  );
}
