import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Route as RouteIcon, ArrowRight, Users } from "lucide-react";
import { api } from "../lib/api";
import { Card, StatusBadge, Skeleton, EmptyState } from "../components/ui";
import { fmtTime, inr } from "../lib/format";
import { modeOf, type RideMode } from "../lib/modes";
import type { TripStatus } from "../lib/types";

interface TripRow {
  id: string; status: TripStatus; role: "DRIVER" | "PASSENGER"; trackingActive: boolean;
  ride: {
    originAddr: string; destAddr: string; departureTime: string; farePerSeat: number;
    driver: { name: string }; vehicle: { model: string; type: RideMode };
    bookings: { passenger: { name: string }; seatsBooked: number }[];
  };
}

const ACTIVE: TripStatus[] = ["RIDE_BOOKED", "TRIP_STARTED", "TRIP_IN_PROGRESS", "TRIP_COMPLETED", "PAYMENT_PENDING"];

export default function Trips() {
  const trips = useQuery({ queryKey: ["trips", "mine"], queryFn: async () => (await api.get<TripRow[]>("/trips/mine")).data });

  const active = trips.data?.filter((t) => ACTIVE.includes(t.status)) ?? [];
  const done = trips.data?.filter((t) => t.status === "PAYMENT_COMPLETED") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">My Trips</h1>

      {trips.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (trips.data?.length ?? 0) === 0 ? (
        <EmptyState icon={<RouteIcon className="h-10 w-10" />} title="No trips yet" hint="Book a ride or offer one to see it here." />
      ) : (
        <>
          <Section title="Active & upcoming" rows={active} />
          <Section title="Completed" rows={done} muted />
        </>
      )}
    </div>
  );
}

function Section({ title, rows, muted }: { title: string; rows: TripRow[]; muted?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">{title}</h2>
      <div className="grid gap-3">
        {rows.map((t) => (
          <Link key={t.id} to={`/app/trips/${t.id}`} className={`card block p-4 transition hover:shadow-md ${muted ? "opacity-90" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${t.role === "DRIVER" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>{t.role}</span>
                <StatusBadge status={t.status} />
                {t.trackingActive && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" /> live</span>}
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-700">{t.ride.originAddr.split(",")[0]}</span>
              <span className="text-slate-300">→</span>
              <span className="font-semibold text-slate-700">{t.ride.destAddr.split(",")[0]}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>{fmtTime(t.ride.departureTime)}</span>
              <span>· {modeOf(t.ride.vehicle.type).emoji} {t.ride.vehicle.model}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {t.ride.bookings.reduce((a, b) => a + b.seatsBooked, 0)} booked</span>
              <span>· {inr(t.ride.farePerSeat)}/seat</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
