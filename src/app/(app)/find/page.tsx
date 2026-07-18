"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    <>
      <div className="page-head">
        <h1>Find a Ride</h1>
        <p>Search rides matching your route, date and time.</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="surface" style={{ marginBottom: 20 }}>
        <form onSubmit={search}>
          <div className="form-grid two">
            <LocationInput label="Pickup" value={origin} onChange={setOrigin} saved={saved} />
            <LocationInput label="Destination" value={dest} onChange={setDest} saved={saved} />
            <div className="field">
              <label>Travel date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="field">
              <label>Seats needed</label>
              <input type="number" min={1} max={10} value={seats} onChange={(e) => setSeats(+e.target.value)} />
            </div>
          </div>
          <button className="btn-primary" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? "Searching…" : "🔎 Search rides"}
          </button>
        </form>
      </div>

      {route && (
        <div className="surface" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Your route</div>
          <DynamicMap
            points={[
              { lat: origin!.lat, lng: origin!.lng, kind: "origin" },
              { lat: dest!.lat, lng: dest!.lng, kind: "dest" },
            ]}
            route={route.coordinates}
          />
          <p className="muted sm" style={{ marginTop: 10 }}>
            {route.distanceKm} km · ~{Math.round(route.durationMin)} min
          </p>
        </div>
      )}

      {matches && (
        <>
          <div className="section-title">
            {matches.length} matching ride{matches.length === 1 ? "" : "s"}
          </div>
          {matches.length === 0 ? (
            <div className="surface empty">
              <span className="big-ico">🕳️</span>
              No matching rides yet. Try a wider time or check back later.
            </div>
          ) : (
            <div className="grid">
              {matches.map((m) => (
                <div key={m.id} className="ride-card">
                  <div className="ride-top">
                    <span className="avatar">{(m.driverName ?? "D").slice(0, 2).toUpperCase()}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{m.driverName ?? "Driver"}</div>
                      <div className="muted sm">{m.vehicle}</div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <span className="fare">₹{m.farePerSeat}</span>
                  </div>
                  <div className="ride-route">
                    <span>{m.originLabel.split(",")[0]}</span>
                    <span className="arrow">→</span>
                    <span>{m.destLabel.split(",")[0]}</span>
                  </div>
                  <div className="ride-meta">
                    <span>🕒 <b>{new Date(m.departAt).toLocaleString()}</b></span>
                    <span>💺 <b>{m.seatsAvailable}</b> free</span>
                    <span>📏 {m.distanceKm} km</span>
                    <span>📍 pickup ~{m.originDetourKm} km away</span>
                  </div>
                  <div className="btn-row">
                    <button className="btn-primary" onClick={() => book(m)} disabled={bookingId === m.id}>
                      {bookingId === m.id ? "Booking…" : `Book ${seats} seat${seats > 1 ? "s" : ""}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
