"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
      const r = await api<RouteResult>("/api/route", {
        method: "POST",
        body: { from: { lat: origin.lat, lng: origin.lng }, to: { lat: dest.lat, lng: dest.lng } },
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
      <div className="surface empty">
        <span className="big-ico">🚙</span>
        You need a registered vehicle before offering a ride.
        <div style={{ marginTop: 14 }}>
          <Link href="/vehicles" className="btn-primary">
            Register a vehicle
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Offer a Ride</h1>
        <p>Publish your route and share empty seats with colleagues.</p>
      </div>

      {error && <div className="error">{error}</div>}

      {step === "form" ? (
        <div className="surface">
          <form onSubmit={preview}>
            <div className="field">
              <label>Vehicle</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.model} · {v.registration_number} ({v.seating_capacity} seats)
                  </option>
                ))}
              </select>
            </div>
            <LocationInput label="Pickup / origin" value={origin} onChange={setOrigin} saved={saved} />
            <LocationInput label="Destination" value={dest} onChange={setDest} saved={saved} />
            <div className="form-grid two">
              <div className="field">
                <label>Departure</label>
                <input type="datetime-local" value={departAt} onChange={(e) => setDepartAt(e.target.value)} required />
              </div>
              <div className="field">
                <label>Seats offered</label>
                <input type="number" min={1} max={20} value={seats} onChange={(e) => setSeats(+e.target.value)} />
              </div>
              <div className="field">
                <label>Fare per seat (₹)</label>
                <input type="number" min={0} value={fare} onChange={(e) => setFare(+e.target.value)} />
              </div>
              <div className="field" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                  <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
                  Recurring (weekdays)
                </label>
              </div>
            </div>
            <button className="btn-primary" disabled={busy} style={{ marginTop: 8 }}>
              {busy ? "Calculating…" : "Preview route →"}
            </button>
          </form>
        </div>
      ) : (
        <div className="grid cols-2">
          <div className="surface">
            <div className="section-title" style={{ marginTop: 0 }}>Confirm route</div>
            <DynamicMap
              points={[
                { lat: origin!.lat, lng: origin!.lng, kind: "origin" },
                { lat: dest!.lat, lng: dest!.lng, kind: "dest" },
              ]}
              route={route!.coordinates}
            />
          </div>
          <div className="surface">
            <div className="section-title" style={{ marginTop: 0 }}>Ride summary</div>
            <div className="panel" style={{ border: "none", padding: 0 }}>
              <div className="row"><span className="k">From</span><span>{origin!.label.split(",")[0]}</span></div>
              <div className="row"><span className="k">To</span><span>{dest!.label.split(",")[0]}</span></div>
              <div className="row"><span className="k">Distance</span><span>{route!.distanceKm} km</span></div>
              <div className="row"><span className="k">Duration</span><span>~{Math.round(route!.durationMin)} min</span></div>
              <div className="row"><span className="k">Departs</span><span>{new Date(departAt).toLocaleString()}</span></div>
              <div className="row"><span className="k">Seats</span><span>{seats}</span></div>
              <div className="row"><span className="k">Fare / seat</span><span className="fare">₹{fare}</span></div>
              {suggestedFare != null && suggestedFare !== fare && (
                <div className="row">
                  <span className="k">💡 Fair fare estimate</span>
                  <span className="chip suggest" onClick={() => setFare(suggestedFare)}>
                    Apply ₹{suggestedFare}/seat
                  </span>
                </div>
              )}
            </div>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn-success" onClick={publish} disabled={busy}>
                {busy ? "Publishing…" : "✅ Publish ride"}
              </button>
              <button className="btn-ghost" style={{ padding: "11px 18px" }} onClick={() => setStep("form")}>
                ← Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
