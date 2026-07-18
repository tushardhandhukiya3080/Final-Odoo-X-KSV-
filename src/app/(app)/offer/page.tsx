"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car, Clock, Users, IndianRupee, Route as RouteIcon,
  ArrowRight, CheckCircle2, Repeat, Sparkles, Navigation, MapPin, Trash2, Plus,
} from "lucide-react";
import { api } from "@/lib/client";
import DynamicMap from "@/components/map/DynamicMap";
import LocationInput, { type PlaceValue, type SavedPlace } from "@/components/map/LocationInput";
import type { Vehicle, RouteResult } from "@/lib/types";

export default function OfferRidePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [origin, setOrigin] = useState<PlaceValue | null>(null);
  const [dest, setDest] = useState<PlaceValue | null>(null);
  const [departAt, setDepartAt] = useState("");
  const [seats, setSeats] = useState(3);
  const [fare, setFare] = useState(50);
  const [recurring, setRecurring] = useState(false);
  const [trackMode, setTrackMode] = useState<"gps" | "manual">("gps");
  const [stops, setStops] = useState<(PlaceValue | null)[]>([]);

  const [route, setRoute] = useState<RouteResult | null>(null);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fuelPrice, setFuelPrice] = useState(100);

  useEffect(() => {
    api<Vehicle[]>("/api/vehicles").then((v) => {
      setVehicles(v.filter((x) => x.is_active));
      if (v[0]) setVehicleId(v[0].id);
    });
    api<SavedPlace[]>("/api/places").then(setSaved).catch(() => {});
    api<{ fuel_price_per_litre: number }>("/api/org")
      .then((o) => setFuelPrice(Number(o.fuel_price_per_litre) || 100))
      .catch(() => {});
  }, []);

  const cleanStops = stops.filter((s): s is PlaceValue => !!s);

  // Fare optimizer: split the trip's estimated fuel cost across the seats.
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const suggestedFare =
    route && selectedVehicle
      ? Math.max(1, Math.round((route.distanceKm / (selectedVehicle.mileage_kmpl || 15)) * fuelPrice / Math.max(1, seats)))
      : null;

  async function preview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!origin || !dest || !vehicleId || !departAt) {
      setError("Fill vehicle, route and departure time");
      return;
    }
    setBusy(true);
    try {
      const via =
        trackMode === "manual"
          ? cleanStops.map((s) => ({ lat: s.lat, lng: s.lng }))
          : [];
      const r = await api<RouteResult>("/api/route", {
        method: "POST",
        body: { from: { lat: origin.lat, lng: origin.lng }, to: { lat: dest.lat, lng: dest.lng }, via },
      });
      setRoute(r);
      setStep("confirm");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string }>("/api/rides", {
        method: "POST",
        body: {
          vehicleId,
          origin,
          dest,
          stops: trackMode === "manual" ? cleanStops : [],
          trackMode,
          departAt,
          seats,
          farePerSeat: fare,
          isRecurring: recurring,
        },
      });
      router.push(`/trips/${res.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (vehicles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-slate-900">Offer a Ride</h1>
          <p className="text-sm font-semibold text-slate-500">Publish your route and share empty seats with colleagues.</p>
        </div>
        <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
          <Car className="mb-3 h-10 w-10 text-slate-300" />
          <div className="font-display text-lg font-bold text-slate-700">Register a vehicle first</div>
          <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">You need a registered vehicle before you can offer a ride.</div>
          <Link href="/vehicles" className="btn-primary mt-4 inline-flex w-auto">
            Register a vehicle <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase text-slate-900">Offer a Ride</h1>
        <p className="text-sm font-semibold text-slate-500">Publish your route and share empty seats with colleagues.</p>
      </div>

      {error && <div className="error">{error}</div>}

      {step === "form" ? (
        <form onSubmit={preview} className="space-y-6">
          {/* Vehicle */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Vehicle</div>
            <div className="bento">
              <div className="grid gap-2 sm:grid-cols-2">
                {vehicles.map((v) => {
                  const selected = vehicleId === v.id;
                  return (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => setVehicleId(v.id)}
                      className={`rounded-xl p-3 text-left ring-1 ring-black/10 transition ${
                        selected
                          ? "bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] text-white shadow-btn"
                          : "bg-white text-slate-900 hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-display text-sm font-bold uppercase">
                        <Car className="h-4 w-4" /> {v.model}
                      </div>
                      <div className={`mt-0.5 text-xs font-bold ${selected ? "text-white/80" : "text-slate-400"}`}>
                        {v.registration_number} · {v.seating_capacity} seats
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Route */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Route</div>
            <div className="bento space-y-4 overflow-visible">
              <LocationInput label="Pickup / origin" value={origin} onChange={setOrigin} saved={saved} />
              <LocationInput label="Destination" value={dest} onChange={setDest} saved={saved} />
            </div>
          </div>

          {/* Tracking mode */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Live tracking</div>
            <div className="bento space-y-4 overflow-visible">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setTrackMode("gps")}
                  className={`rounded-xl p-3.5 text-left ring-1 ring-black/10 transition ${trackMode === "gps" ? "bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] text-white shadow-btn" : "bg-white text-slate-900 hover:-translate-y-0.5 hover:shadow-md"}`}
                >
                  <div className="flex items-center gap-2 font-display text-sm font-bold uppercase"><Navigation className="h-4 w-4" /> GPS · Auto</div>
                  <div className={`mt-0.5 text-xs font-semibold ${trackMode === "gps" ? "text-white/80" : "text-slate-400"}`}>Your phone shares live location while driving.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setTrackMode("manual")}
                  className={`rounded-xl p-3.5 text-left ring-1 ring-black/10 transition ${trackMode === "manual" ? "bg-gradient-to-b from-[#fcd775] to-[#efab24] text-[#5c3702] shadow-btn" : "bg-white text-slate-900 hover:-translate-y-0.5 hover:shadow-md"}`}
                >
                  <div className="flex items-center gap-2 font-display text-sm font-bold uppercase"><MapPin className="h-4 w-4" /> Manual · Stops</div>
                  <div className={`mt-0.5 text-xs font-semibold ${trackMode === "manual" ? "text-[#5c3702]/80" : "text-slate-400"}`}>Add stops; tap each as you reach it.</div>
                </button>
              </div>

              {trackMode === "manual" && (
                <div className="space-y-3 border-t border-black/5 pt-4">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Stops along the way (in order)</div>
                  {stops.length === 0 && (
                    <p className="text-sm font-medium text-slate-400">No stops yet — e.g. Gandhinagar → Sector 1 → Adalaj → Chandkheda → Ahmedabad.</p>
                  )}
                  {stops.map((s, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="flex-1">
                        <LocationInput
                          label={`Stop ${i + 1}`}
                          value={s}
                          onChange={(v) => setStops((prev) => prev.map((x, j) => (j === i ? v : x)))}
                          saved={saved}
                          placeholder="Search a stop…"
                        />
                      </div>
                      <button type="button" onClick={() => setStops((prev) => prev.filter((_, j) => j !== i))} className="mb-1 rounded-xl bg-white p-2.5 text-rose-600 shadow-btn ring-1 ring-black/10" aria-label="Remove stop">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setStops((prev) => [...prev, null])} className="lp-btn bg-white text-slate-800">
                    <Plus className="h-4 w-4" /> Add stop
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Trip details */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Trip details</div>
            <div className="bento">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label"><Clock className="mr-1 inline h-3.5 w-3.5" /> Departure</label>
                  <input type="datetime-local" className="input" value={departAt} onChange={(e) => setDepartAt(e.target.value)} required />
                </div>
                <div>
                  <label className="label"><Users className="mr-1 inline h-3.5 w-3.5" /> Seats offered</label>
                  <input type="number" min={1} max={20} className="input" value={seats} onChange={(e) => setSeats(+e.target.value)} />
                </div>
                <div>
                  <label className="label"><IndianRupee className="mr-1 inline h-3.5 w-3.5" /> Fare per seat</label>
                  <input type="number" min={0} className="input" value={fare} onChange={(e) => setFare(+e.target.value)} />
                </div>
                <div>
                  <label className="label"><Repeat className="mr-1 inline h-3.5 w-3.5" /> Recurring</label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-inner ring-1 ring-black/10">
                    <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 accent-brand-500" />
                    Runs every weekday
                  </label>
                </div>
              </div>
            </div>
          </div>

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Calculating…" : <><RouteIcon className="h-4 w-4" /> Preview route</>}
          </button>
        </form>
      ) : (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          {/* Map */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Confirm route</div>
            <div className="bento">
              <DynamicMap
                points={[
                  { lat: origin!.lat, lng: origin!.lng, kind: "origin" },
                  { lat: dest!.lat, lng: dest!.lng, kind: "dest" },
                ]}
                route={route!.coordinates}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Ride summary</div>
            <div className="bento">
              <div className="divide-y divide-black/5">
                <SummaryRow label="From" value={origin!.label.split(",")[0]} />
                {trackMode === "manual" && cleanStops.length > 0 && (
                  <SummaryRow label="Stops" value={cleanStops.map((s) => s.label.split(",")[0]).join(" → ")} />
                )}
                <SummaryRow label="To" value={dest!.label.split(",")[0]} />
                <SummaryRow label="Tracking" value={trackMode === "manual" ? "Manual · stop-by-stop" : "GPS · auto"} />
                <SummaryRow label="Distance" value={`${route!.distanceKm} km`} />
                <SummaryRow label="Duration" value={`~${Math.round(route!.durationMin)} min`} />
                <SummaryRow label="Departs" value={new Date(departAt).toLocaleString()} />
                <SummaryRow label="Seats" value={String(seats)} />
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-semibold text-slate-500">Fare / seat</span>
                  <span className="font-display text-lg font-bold text-slate-900">₹{fare}</span>
                </div>
              </div>

              {suggestedFare != null && suggestedFare !== fare && (
                <button
                  type="button"
                  onClick={() => setFare(suggestedFare)}
                  className="mt-3 flex w-full items-center justify-between rounded-xl bg-gradient-to-b from-[#ccfaf3] to-[#7fe6d6] px-3.5 py-2.5 text-left ring-1 ring-black/10 transition hover:brightness-[1.03]"
                >
                  <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-teal-800">
                    <Sparkles className="h-4 w-4" /> Fair fare estimate
                  </span>
                  <span className="font-display text-sm font-bold text-teal-900">Apply ₹{suggestedFare}/seat</span>
                </button>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-success" onClick={publish} disabled={busy}>
                  {busy ? "Publishing…" : <><CheckCircle2 className="h-4 w-4" /> Publish ride</>}
                </button>
                <button type="button" className="lp-btn bg-white text-slate-800" onClick={() => setStep("form")}>
                  <ArrowRight className="h-4 w-4 rotate-180" /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}
