"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Navigation, CheckCircle2, Flag, Loader2 } from "lucide-react";
import { api } from "@/lib/client";

interface Props {
  rideId: string;
  trackMode: "manual" | "gps";
  waypoints: string[]; // ordered labels: [origin, ...stops, dest]
  progressIndex: number;
  status: string; // published|started|in_progress|completed|cancelled
}

// Driver-only panel to move the ride along: tap each stop (manual) or share GPS.
export default function RideLiveControls({ rideId, trackMode, waypoints, progressIndex, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const watchRef = useRef<number | null>(null);

  const live = status === "started" || status === "in_progress";
  const arrived = progressIndex >= waypoints.length - 1;

  useEffect(() => {
    return () => {
      if (watchRef.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  async function advance() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/rides/" + rideId + "/progress", { method: "POST", body: { action: "advance" } });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggleShare() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available on this device");
      return;
    }
    if (sharing) {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setSharing(false);
      return;
    }
    setError(null);
    setSharing(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        api("/api/rides/" + rideId + "/ping", {
          method: "POST",
          body: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }).catch(() => {});
      },
      () => setError("Could not read your location"),
      { enableHighAccuracy: true, maximumAge: 4000 },
    );
  }

  return (
    <div className="bento space-y-4">
      <div className="flex items-center gap-2">
        {trackMode === "gps" ? <Navigation className="h-4 w-4 text-brand-600" /> : <MapPin className="h-4 w-4 text-brand-600" />}
        <span className="font-display text-sm font-bold uppercase text-slate-900">
          Live tracking · {trackMode === "gps" ? "GPS auto" : "Manual stops"}
        </span>
      </div>

      {!live && (
        <p className="text-sm font-medium text-slate-400">Start the trip below to begin sharing your progress with riders.</p>
      )}

      {trackMode === "manual" ? (
        <>
          {/* Ordered stops with reached / current / upcoming state */}
          <div className="flex flex-col gap-2">
            {waypoints.map((w, i) => {
              const reached = i <= progressIndex;
              const current = i === progressIndex;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ring-1 ring-black/10 ${current ? "bg-gradient-to-b from-[#2dd4bf] to-[#0d9488] text-white" : reached ? "bg-slate-200 text-slate-500" : "bg-white text-slate-400"}`}>
                    {reached ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={`text-sm font-semibold ${current ? "text-slate-900" : reached ? "text-slate-400 line-through" : "text-slate-600"}`}>
                    {w.split(",")[0]}
                    {i === 0 && <span className="ml-1 text-[10px] font-bold uppercase text-slate-400">start</span>}
                    {i === waypoints.length - 1 && <span className="ml-1 text-[10px] font-bold uppercase text-slate-400">end</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <button onClick={advance} disabled={!live || busy || arrived} className="btn-primary w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : arrived ? <><Flag className="h-4 w-4" /> Reached destination</> : <><CheckCircle2 className="h-4 w-4" /> Reached next stop</>}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-500">Share your phone&apos;s location so riders can watch you move in real time.</p>
          <button onClick={toggleShare} disabled={!live} className={sharing ? "btn-danger w-full" : "btn-primary w-full"}>
            <Navigation className="h-4 w-4" /> {sharing ? "Stop sharing location" : "Share live location"}
          </button>
          {sharing && <div className="flex items-center gap-2 text-xs font-bold uppercase text-teal-700"><span className="h-2 w-2 animate-ping rounded-full bg-teal-500" /> Broadcasting GPS…</div>}
        </>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
