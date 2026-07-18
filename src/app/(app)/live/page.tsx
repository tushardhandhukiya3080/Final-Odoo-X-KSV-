"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Radar, RefreshCw, Users, Car, ArrowRight } from "lucide-react";
import { api } from "@/lib/client";
import type { LiveRide } from "@/components/map/LiveRidesMap";

const LiveRidesMap = dynamic(() => import("@/components/map/LiveRidesMap"), {
  ssr: false,
  loading: () => (
    <div className="map tall center-load">
      <div className="spinner" />
    </div>
  ),
});

const DEFAULT_CENTER: [number, number] = [23.0225, 72.5714]; // Ahmedabad

export default function LiveMapPage() {
  const [rides, setRides] = useState<LiveRide[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setRides(await api<LiveRide[]>("/api/rides/live"));
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Poll so markers move as drivers ping / advance stops.
  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  const list = rides ?? [];
  const free = list.filter((r) => r.free).length;
  const center: [number, number] = list.length ? [list[0].lat, list[0].lng] : DEFAULT_CENTER;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase text-slate-900">Live Map</h1>
          <p className="text-sm font-semibold text-slate-500">Every active driver in your org — who&apos;s free, who&apos;s taken, and where they are now.</p>
        </div>
        <button onClick={load} className="lp-btn bg-white text-slate-700" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#0d9488] ring-2 ring-white" /> Free</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#e11d48] ring-2 ring-white" /> Taken / full</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#2563eb] ring-2 ring-white" /> You</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-brand-600"><Radar className="h-4 w-4" /> {list.length} on the road · {free} free</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="bento p-0">
            <LiveRidesMap rides={list} center={center} />
          </div>
        </div>

        {/* side list */}
        <div className="space-y-3">
          {list.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
              <Car className="mb-3 h-9 w-9 text-slate-300" />
              <div className="font-display text-lg font-bold text-slate-700">No active drivers</div>
              <div className="mt-1 max-w-xs text-sm font-medium text-slate-400">Offer a ride to appear on the map for your colleagues.</div>
            </div>
          ) : (
            list.map((r) => (
              <Link key={r.id} href={`/trips/${r.id}`} className="bento bento-hover block">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${r.isMine ? "bg-[#2563eb]" : r.free ? "bg-[#0d9488]" : "bg-[#e11d48]"}`} />
                    <span className="font-display text-sm font-bold uppercase text-slate-900">{r.isMine ? "You" : r.driverName ?? "Driver"}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ring-1 ring-black/10 ${r.free ? "bg-gradient-to-b from-[#2dd4bf] to-[#0d9488] text-white" : "bg-gradient-to-b from-[#fb7185] to-[#e11d48] text-white"}`}>
                    {r.free ? `${r.seatsAvailable} free` : "Taken"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-700">
                  {r.from} <ArrowRight className="h-3.5 w-3.5 text-brand-500" /> {r.to}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{r.seatsAvailable}/{r.seatsTotal}</span>
                  <span>{r.status === "published" ? "waiting" : "en route"}</span>
                  <span className="uppercase">{r.trackMode}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
