"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DynamicMap from "@/components/map/DynamicMap";
import LocationInput, { type PlaceValue } from "@/components/map/LocationInput";
import type { RouteResult } from "@/lib/types";

// ── Tuning knobs (heuristics — real traffic needs calibrating) ────────────────
// ponytail: OSRM gives a single free-ish-flow duration; we fan it out into
// best/avg/worst with fixed multipliers. Swap for a real traffic feed to tune.
const BEST_FACTOR = 0.8; // light traffic / green lights
const AVG_FACTOR = 1.0; // OSRM's own estimate
const WORST_FACTOR = 1.7; // rush hour / detours
const PICKUP_WAIT_MIN = 2; // driver waits at your pickup
const SIM_BASE_SECONDS = 18; // wall-clock for the whole trip at 1× speed
const PICKUP_PAUSE_MS = 1400; // on-screen "picking you up" beat

type LatLng = [number, number];

// Small local haversine (km) — geo.ts is server-only, so don't import it here.
function segKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return R * 2 * Math.asin(Math.sqrt(h));
}

function fmt(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

async function fetchLeg(from: PlaceValue, to: PlaceValue): Promise<RouteResult> {
  const res = await fetch("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: { lat: from.lat, lng: from.lng }, to: { lat: to.lat, lng: to.lng } }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Could not compute a route");
  return json.data as RouteResult;
}

interface Sim {
  path: LatLng[]; // [lat,lng] polyline for the car to follow
  routeLngLat: [number, number][]; // [lng,lat] for MapView's polyline
  cum: number[]; // cumulative km at each path vertex
  total: number; // total km
  pickupDist: number; // km at which the pickup happens
  drivingMin: number; // OSRM driving minutes (both legs)
  distanceKm: number;
}

function buildSim(leg1: RouteResult, leg2: RouteResult): Sim {
  const routeLngLat = [...leg1.coordinates, ...leg2.coordinates];
  const path: LatLng[] = routeLngLat.map(([lng, lat]) => [lat, lng]);
  const cum: number[] = [0];
  for (let i = 1; i < path.length; i++) cum[i] = cum[i - 1] + segKm(path[i - 1], path[i]);
  const pickupIdx = Math.max(0, leg1.coordinates.length - 1);
  return {
    path,
    routeLngLat,
    cum,
    total: cum[cum.length - 1] || 0,
    pickupDist: cum[pickupIdx] ?? 0,
    drivingMin: leg1.durationMin + leg2.durationMin,
    distanceKm: Number((leg1.distanceKm + leg2.distanceKm).toFixed(2)),
  };
}

export default function Simulator() {
  const [driver, setDriver] = useState<PlaceValue | null>(null);
  const [pickup, setPickup] = useState<PlaceValue | null>(null);
  const [dest, setDest] = useState<PlaceValue | null>(null);

  const [sim, setSim] = useState<Sim | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [car, setCar] = useState<{ lat: number; lng: number } | null>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const [playing, setPlaying] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [pickedUp, setPickedUp] = useState(false);
  const [atPickup, setAtPickup] = useState(false); // holding at pickup point
  const [speed, setSpeed] = useState(2);

  // Animation refs (avoid stale closures inside requestAnimationFrame).
  const rafRef = useRef<number | null>(null);
  const traveledRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  const pickedUpRef = useRef(false);
  const speedRef = useRef(speed);
  const simRef = useRef<Sim | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    simRef.current = sim;
  }, [sim]);

  const etas = useMemo(() => {
    if (!sim) return null;
    const drive = sim.drivingMin;
    return {
      best: drive * BEST_FACTOR + PICKUP_WAIT_MIN,
      avg: drive * AVG_FACTOR + PICKUP_WAIT_MIN,
      worst: drive * WORST_FACTOR + PICKUP_WAIT_MIN,
    };
  }, [sim]);

  function posAt(d: number, s: Sim): { lat: number; lng: number } {
    if (d <= 0) return { lat: s.path[0][0], lng: s.path[0][1] };
    if (d >= s.total) {
      const last = s.path[s.path.length - 1];
      return { lat: last[0], lng: last[1] };
    }
    let i = 0;
    while (i < s.cum.length - 1 && s.cum[i + 1] < d) i++;
    const segLen = s.cum[i + 1] - s.cum[i] || 1e-9;
    const f = (d - s.cum[i]) / segLen;
    const a = s.path[i];
    const b = s.path[i + 1];
    return { lat: a[0] + (b[0] - a[0]) * f, lng: a[1] + (b[1] - a[1]) * f };
  }

  function stopRaf() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTsRef.current = null;
  }

  function frame(ts: number) {
    const s = simRef.current;
    if (!s) return;

    // Holding at the pickup point.
    if (pauseUntilRef.current) {
      if (ts < pauseUntilRef.current) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      pauseUntilRef.current = 0;
      lastTsRef.current = ts;
      setAtPickup(false);
    }

    const last = lastTsRef.current ?? ts;
    const dt = Math.min((ts - last) / 1000, 0.1); // clamp big gaps (tab switch)
    lastTsRef.current = ts;

    const kmPerSec = s.total / (SIM_BASE_SECONDS / speedRef.current);
    let traveled = traveledRef.current + kmPerSec * dt;

    // Reached the passenger's pickup → stop and pick up.
    if (!pickedUpRef.current && traveled >= s.pickupDist && s.pickupDist > 0) {
      traveled = s.pickupDist;
      pickedUpRef.current = true;
      setPickedUp(true);
      setAtPickup(true);
      pauseUntilRef.current = ts + PICKUP_PAUSE_MS;
    }

    if (traveled >= s.total) {
      traveledRef.current = s.total;
      setCar(posAt(s.total, s));
      setProgress(1);
      setArrived(true);
      setPlaying(false);
      stopRaf();
      return;
    }

    traveledRef.current = traveled;
    setCar(posAt(traveled, s));
    setProgress(s.total ? traveled / s.total : 0);
    rafRef.current = requestAnimationFrame(frame);
  }

  function play() {
    if (!simRef.current || arrived) return;
    setPlaying(true);
    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(frame);
  }
  function pause() {
    setPlaying(false);
    stopRaf();
  }
  function restart() {
    stopRaf();
    traveledRef.current = 0;
    pauseUntilRef.current = 0;
    pickedUpRef.current = false;
    setPickedUp(false);
    setAtPickup(false);
    setArrived(false);
    setProgress(0);
    if (simRef.current) setCar(posAt(0, simRef.current));
    setPlaying(false);
  }

  async function run() {
    if (!driver || !pickup || !dest) {
      setError("Set the driver start, your pickup, and the destination.");
      return;
    }
    setError(null);
    setLoading(true);
    stopRaf();
    try {
      const [leg1, leg2] = await Promise.all([fetchLeg(driver, pickup), fetchLeg(pickup, dest)]);
      const next = buildSim(leg1, leg2);
      simRef.current = next;
      setSim(next);
      traveledRef.current = 0;
      pauseUntilRef.current = 0;
      pickedUpRef.current = false;
      setPickedUp(false);
      setAtPickup(false);
      setArrived(false);
      setProgress(0);
      setCar(posAt(0, next));
      // Auto-start the animation.
      setPlaying(true);
      lastTsRef.current = null;
      rafRef.current = requestAnimationFrame(frame);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Cleanup on unmount.
  useEffect(() => () => stopRaf(), []);

  const status = arrived
    ? "🏁 Arrived at the destination"
    : !sim
      ? "Set three points and run the simulation."
      : atPickup
        ? "🧍 Picking you up…"
        : pickedUp
          ? "🚕 On the way to the destination…"
          : "🚗 Driver heading to your pickup…";

  const points = [
    driver && { lat: driver.lat, lng: driver.lng, kind: "origin" as const },
    pickup && { lat: pickup.lat, lng: pickup.lng, kind: "pickup" as const },
    dest && { lat: dest.lat, lng: dest.lng, kind: "dest" as const },
  ].filter(Boolean) as { lat: number; lng: number; kind: "origin" | "pickup" | "dest" }[];

  return (
    <div className="sim">
      <div className="card">
        <h2 className="sim-title">🎮 Ride simulation</h2>
        <p className="muted sm">
          Watch the driver drive from their start, stop to pick you up, then continue to the
          destination — and see best / average / worst-case arrival times.
        </p>
        <div className="sim-inputs">
          <LocationInput label="🚗 Driver start" value={driver} onChange={setDriver} placeholder="Where the driver begins…" />
          <LocationInput label="🧍 Your pickup" value={pickup} onChange={setPickup} placeholder="Where you get picked up…" />
          <LocationInput label="🏁 Destination" value={dest} onChange={setDest} placeholder="Where you're both going…" />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" onClick={run} disabled={loading}>
          {loading ? "Building route…" : sim ? "Re-run simulation" : "Run simulation"}
        </button>
      </div>

      {sim && (
        <>
          <div className="card">
            <div className="sim-status">
              <span>{status}</span>
              <span className="muted sm">{Math.round(progress * 100)}%</span>
            </div>
            <div className="sim-bar">
              <div className="sim-bar-fill" style={{ width: `${progress * 100}%` }} />
              {sim.total > 0 && (
                <div className="sim-bar-pickup" style={{ left: `${(sim.pickupDist / sim.total) * 100}%` }} title="Your pickup" />
              )}
            </div>

            <DynamicMap points={points} route={sim.routeLngLat} live={car} tall />

            <div className="sim-controls">
              {playing ? (
                <button className="btn-ghost" onClick={pause}>⏸ Pause</button>
              ) : (
                <button className="btn-ghost" onClick={play} disabled={arrived}>▶ Play</button>
              )}
              <button className="btn-ghost" onClick={restart}>↻ Restart</button>
              <label className="sim-speed">
                Speed {speed}×
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                />
              </label>
            </div>
          </div>

          {etas && (
            <div className="eta-grid">
              <div className="eta-card best">
                <span className="eta-label">Best case</span>
                <span className="eta-time">{fmt(etas.best)}</span>
                <span className="muted sm">light traffic</span>
              </div>
              <div className="eta-card avg">
                <span className="eta-label">Average</span>
                <span className="eta-time">{fmt(etas.avg)}</span>
                <span className="muted sm">typical</span>
              </div>
              <div className="eta-card worst">
                <span className="eta-label">Worst case</span>
                <span className="eta-time">{fmt(etas.worst)}</span>
                <span className="muted sm">heavy traffic</span>
              </div>
              <div className="eta-card">
                <span className="eta-label">Distance</span>
                <span className="eta-time">{sim.distanceKm} km</span>
                <span className="muted sm">incl. {PICKUP_WAIT_MIN} min pickup</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
