"use client";

import { useEffect, useRef, useState } from "react";

export interface PlaceValue {
  lat: number;
  lng: number;
  label: string;
}

export interface SavedPlace {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  label: string;
  value: PlaceValue | null;
  onChange: (v: PlaceValue) => void;
  saved?: SavedPlace[];
  placeholder?: string;
}

export default function LocationInput({ label, value, onChange, saved = [], placeholder }: Props) {
  const [text, setText] = useState(value?.label ?? "");
  const [hits, setHits] = useState<PlaceValue[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.label]);

  // Debounced geocode.
  useEffect(() => {
    if (text.length < 3 || text === value?.label) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(text)}`);
        const json = await res.json();
        if (json.success) {
          setHits(json.data.map((h: { lat: number; lng: number; label: string }) => h));
          setOpen(true);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [text, value?.label]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(v: PlaceValue) {
    onChange(v);
    setText(v.label);
    setOpen(false);
    setHits([]);
  }

  function useCurrent() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => pick({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Current location" }),
      () => alert("Could not get your location"),
    );
  }

  return (
    <div className="field autocomplete" ref={boxRef}>
      <label>{label}</label>
      <input
        type="text"
        value={text}
        placeholder={placeholder ?? "Search address…"}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        autoComplete="off"
      />
      <div className="chips" style={{ marginTop: 8 }}>
        <span className="chip" onClick={useCurrent}>📍 Current</span>
        {saved.map((s) => (
          <span key={s.label} className="chip" onClick={() => pick({ lat: s.lat, lng: s.lng, label: s.address })}>
            {s.label === "Home" ? "🏠" : s.label === "Office" ? "🏢" : "⭐"} {s.label}
          </span>
        ))}
      </div>
      {open && (hits.length > 0 || loading) && (
        <ul className="ac-list">
          {loading && <li className="muted">Searching…</li>}
          {hits.map((h, i) => (
            <li key={i} onClick={() => pick(h)}>
              {h.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
