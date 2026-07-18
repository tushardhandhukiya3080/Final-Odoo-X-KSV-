"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Sparkles, Clock, Users, Calendar, MapPin, Car, Star, ArrowRight, CheckCircle2,
  Route as RouteIcon, RefreshCw, Navigation, Radio,
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

interface AvailStop {
  label: string;
  reached: boolean;
  isOrigin: boolean;
  isDest: boolean;
}
interface Avail {
  id: string;
  originLabel: string;
  destLabel: string;
  stops: AvailStop[];
  distanceKm: number;
  departAt: string;
  seatsAvailable: number;
  farePerSeat: number;
  status: string;
  trackMode: "manual" | "gps";
  currentLabel: string;
  driverName: string | null;
  vehicle: string;
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
  const [available, setAvailable] = useState<Avail[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAvailable = useCallback(async () => {
    setRefreshing(true);
    try {
      setAvailable(await api<Avail[]>("/api/rides/available"));
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    api<SavedPlace[]>("/api/places").then(setSaved).catch(() => {});
    loadAvailable();
  }, [loadAvailable]);

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

  async function bookRide(id: string) {
    setBookingId(id);
    setError(null);
    try {
      await api("/api/bookings", { method: "POST", body: { rideId: id, seats } });
      router.push(`/trips/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBookingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase text-slate-900">Find a Ride</h1>
        <p className="text-sm font-semibold text-slate-500">Book a live public ride, or search by your exact route.</p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* ── Available public rides (live) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">
            <Radio className="h-4 w-4 text-brand-500" />
            {available ? `${available.length} ride${available.length === 1 ? "" : "s"} available now` : "Loading available rides…"}
          </div>
          <button type="button" onClick={loadAvailable} className="lp-btn bg-white px-3 py-1.5 text-xs text-slate-700" disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {available && available.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-12 text-center shadow-inner">
            <RouteIcon className="mb-3 h-9 w-9 text-slate-300" />
            <div className="font-display text-lg font-bold text-slate-700">No public rides right now</div>
            <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">Colleagues&apos; live rides show here. Try Refresh, or search your route below.</div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {available?.map((a) => {
              const enRoute = a.status !== "published";
              return (
                <div key={a.id} className="bento bento-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] font-display font-bold text-white ring-1 ring-black/10">
                        {(a.driverName ?? "D").slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div className="font-display font-bold uppercase text-slate-900">{a.driverName ?? "Driver"}</div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500"><Car className="h-3 w-3" />{a.vehicle}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl font-bold text-slate-900">₹{a.farePerSeat}</div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">per seat</div>
                    </div>
                  </div>

                  {/* where to where */}
                  <div className="mt-3 flex items-center gap-2 font-display text-sm font-bold uppercase text-slate-900">
                    {a.originLabel.split(",")[0]}
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand-500" />
                    {a.destLabel.split(",")[0]}
                  </div>

                  {/* route stops with passed / upcoming state */}
                  {a.stops.length > 2 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {a.stops.map((s, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-black/10 ${s.reached ? "bg-slate-200 text-slate-400 line-through" : "bg-white text-slate-700"}`}>
                            {s.label.split(",")[0]}
                          </span>
                          {i < a.stops.length - 1 && <span className={`h-px w-3 ${s.reached ? "bg-slate-300" : "bg-brand-300"}`} />}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* currently where */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-500">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ring-black/10 ${enRoute ? "bg-gradient-to-b from-[#ccfaf3] to-[#7fe6d6] text-teal-800" : "bg-white text-slate-500"}`}>
                      {a.trackMode === "gps" ? <Navigation className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                      {enRoute ? <b className="text-teal-900">Now: {a.currentLabel.split(",")[0]}</b> : "Not started"}
                    </span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(a.departAt).toLocaleString()}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /><b className="text-slate-700">{a.seatsAvailable}</b> free</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ring-1 ring-black/10 ${enRoute ? "bg-gradient-to-b from-[#8a95f0] to-[#5560d8] text-white" : "bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] text-white"}`}>
                      {enRoute ? "En route" : "Waiting"}
                    </span>
                    <button className="btn-primary" onClick={() => bookRide(a.id)} disabled={bookingId === a.id}>
                      {bookingId === a.id ? "Booking…" : <><CheckCircle2 className="h-4 w-4" /> Book now</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Or search your exact route</div>

      <form onSubmit={search} className="bento space-y-4 overflow-visible">
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
                          <button className="btn-primary" onClick={() => bookRide(m.id)} disabled={bookingId === m.id}>
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
