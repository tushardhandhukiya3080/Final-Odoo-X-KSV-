"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, X, Crosshair, Check } from "lucide-react";
import type { PlaceValue } from "./LocationInput";

const PickMap = dynamic(() => import("./PickMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-slate-100">
      <div className="spinner" />
    </div>
  ),
});

const DEFAULT_CENTER: [number, number] = [23.0225, 72.5714]; // Ahmedabad

interface Pt {
  lat: number;
  lng: number;
}

// Shared "choose on map" modal. Tap/drag a pin; we reverse-geocode a label.
export default function MapPicker({
  open,
  initial,
  onClose,
  onSelect,
}: {
  open: boolean;
  initial: PlaceValue | null;
  onClose: () => void;
  onSelect: (v: PlaceValue) => void;
}) {
  const [pt, setPt] = useState<Pt | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [recenter, setRecenter] = useState<Pt | null>(null);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPt(initial ? { lat: initial.lat, lng: initial.lng } : null);
      setLabel(initial?.label ?? "");
    }
  }, [open, initial]);

  // Reverse-geocode the pin (debounced) so the user sees a real address.
  useEffect(() => {
    if (!pt) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?lat=${pt.lat}&lng=${pt.lng}`);
        const j = await res.json();
        if (j.success) setLabel(j.data.label);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [pt]);

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPt(next);
        setRecenter(next);
      },
      () => alert("Could not get your location"),
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <div className="flex items-center gap-2 font-display text-sm font-bold uppercase text-slate-900">
            <MapPin className="h-4 w-4 text-brand-600" /> Pick a location on the map
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex-1">
          <PickMap
            value={pt}
            onPick={setPt}
            recenter={recenter}
            center={initial ? [initial.lat, initial.lng] : DEFAULT_CENTER}
          />
          <button
            onClick={locate}
            className="absolute right-3 top-3 z-[500] flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold uppercase text-slate-700 shadow-btn ring-1 ring-black/10"
          >
            <Crosshair className="h-4 w-4" /> My location
          </button>
        </div>

        <div className="border-t border-black/10 p-3">
          <div className="mb-2 line-clamp-2 text-xs font-semibold text-slate-500">
            {pt ? (loading ? "Finding address…" : label || `${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`) : "Tap anywhere on the map to drop a pin, or drag the pin to fine-tune."}
          </div>
          <button
            disabled={!pt}
            onClick={() => pt && onSelect({ lat: pt.lat, lng: pt.lng, label: label || `Pinned (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)})` })}
            className="btn-primary w-full"
          >
            <Check className="h-4 w-4" /> Use this location
          </button>
        </div>
      </div>
    </div>
  );
}
