"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Sparkles, Clock, Users, Calendar, MapPin, Car, Star, ArrowRight, CheckCircle2,
  Route as RouteIcon,
} from "lucide-react";
import { api } from "@/lib/client";
import DynamicMap from "@/components/map/DynamicMap";
import LocationInput, { type PlaceValue, type SavedPlace } from "@/components/map/LocationInput";
import type { RouteResult } from "@/lib/types";

interface Match {
  id: string;
  originLabel: string;
  destLabel: string;
  route: [number, number][];
  distanceKm: number;
  durationMin: number;
  departAt: string;
  seatsAvailable: number;
  farePerSeat: number;
  driverName: string | null;
  vehicle: string;
  originDetourKm: number;
  destDetourKm: number;
  matchScore: number;
}

export default function FindRidePage() {
  const router = useRouter();
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [origin, setOrigin] = useState<PlaceValue | null>(null);
  const [dest, setDest] = useState<PlaceValue | null>(null);
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState(1);

  const [route, setRoute] = useState<RouteResult | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SavedPlace[]>("/api/places").then(setSaved).catch(() => {});
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!origin || !dest || !date) {
      setError("Enter pickup, destination and travel date");
      return;
    }
    setBusy(true);
    setMatches(null);
    try {
      const [r, m] = await Promise.all([
        api<RouteResult>("/api/route", {
          method: "POST",
          body: { from: { lat: origin.lat, lng: origin.lng }, to: { lat: dest.lat, lng: dest.lng } },
        }),
        api<Match[]>("/api/rides/search", {
          method: "POST",
          body: { origin, dest, departDate: date, seats },
        }),
      ]);
      setRoute(r);
      setMatches(m);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function book(m: Match) {
    setBookingId(m.id);
    setError(null);
    try {
      await api("/api/bookings", { method: "POST", body: { rideId: m.id, seats } });
      router.push(`/trips/${m.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBookingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase text-slate-900">Find a Ride</h1>
        <p className="text-sm font-semibold text-slate-500">Search rides matching your route, date and time.</p>
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={search} className="bento space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <LocationInput label="Pickup" value={origin} onChange={setOrigin} saved={saved} />
          <LocationInput label="Destination" value={dest} onChange={setDest} saved={saved} />
          <div>
            <label className="label"><Calendar className="mr-1 inline h-3 w-3" /> Travel date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label"><Users className="mr-1 inline h-3 w-3" /> Seats needed</label>
            <input type="number" min={1} max={10} className="input" value={seats} onChange={(e) => setSeats(+e.target.value)} />
          </div>
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Searching…" : <><Search className="h-4 w-4" /> Search rides</>}
        </button>
      </form>

      {(route || matches) && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-3">
            {matches && (
              <>
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  <Sparkles className="h-4 w-4 text-brand-500" />
                  {matches.length} matching ride{matches.length === 1 ? "" : "s"}
                </div>
                {matches.length === 0 ? (
                  <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
                    <Search className="mb-3 h-10 w-10 text-slate-300" />
                    <div className="font-display text-lg font-bold text-slate-700">No matching rides yet</div>
                    <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">Try a wider time or check back later.</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map((m) => (
                      <div key={m.id} className="bento bento-hover">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] font-display font-bold text-white ring-1 ring-black/10">
                              {(m.driverName ?? "D").slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <div className="font-display font-bold uppercase text-slate-900">{m.driverName ?? "Driver"}</div>
                              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500"><Car className="h-3 w-3" />{m.vehicle}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-2xl font-bold text-slate-900">₹{m.farePerSeat}</div>
                            <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">per seat</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 font-display text-sm font-bold uppercase text-slate-900">
                          {m.originLabel.split(",")[0]}
                          <ArrowRight className="h-4 w-4 shrink-0 text-brand-500" />
                          {m.destLabel.split(",")[0]}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /><b className="text-slate-700">{new Date(m.departAt).toLocaleString()}</b></span>
                          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /><b className="text-slate-700">{m.seatsAvailable}</b> free</span>
                          <span className="inline-flex items-center gap-1"><RouteIcon className="h-3.5 w-3.5" />{m.distanceKm} km</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />pickup ~{m.originDetourKm} km away</span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ring-1 ring-black/10 ${m.matchScore >= 80 ? "bg-gradient-to-b from-[#2dd4bf] to-[#0d9488] text-white" : "bg-gradient-to-b from-[#fcd775] to-[#efab24] text-[#5c3702]"}`}>
                            <Star className="h-3 w-3" /> {m.matchScore}% match
                          </span>
                          <button className="btn-primary" onClick={() => book(m)} disabled={bookingId === m.id}>
                            {bookingId === m.id ? "Booking…" : <><CheckCircle2 className="h-4 w-4" /> Book {seats} seat{seats > 1 ? "s" : ""}</>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="lg:col-span-2">
            {route && (
              <div className="sticky top-4 space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Your route</div>
                <div className="bento">
                  <DynamicMap
                    points={[
                      { lat: origin!.lat, lng: origin!.lng, kind: "origin" },
                      { lat: dest!.lat, lng: dest!.lng, kind: "dest" },
                    ]}
                    route={route.coordinates}
                  />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    {route.distanceKm} km · ~{Math.round(route.durationMin)} min
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
