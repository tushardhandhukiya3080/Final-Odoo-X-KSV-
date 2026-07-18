"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import LocationInput, { type PlaceValue, type SavedPlace } from "@/components/map/LocationInput";

interface Place extends SavedPlace {
  id: string;
}

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [label, setLabel] = useState("Home");
  const [picked, setPicked] = useState<PlaceValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setPlaces(await api<Place[]>("/api/places"));
  }
  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!picked) {
      setError("Search and select a location first");
      return;
    }
    setSaving(true);
    try {
      await api("/api/places", {
        method: "POST",
        body: { label, address: picked.label, lat: picked.lat, lng: picked.lng },
      });
      setPicked(null);
      setLabel("Home");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api(`/api/places/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <>
      <div className="page-head">
        <h1>Saved Places</h1>
        <p>Save Home, Office &amp; favourites for faster ride search.</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="surface" style={{ marginBottom: 20 }}>
        <form onSubmit={save}>
          <div className="field">
            <label>Label</label>
            <div className="chips" style={{ marginBottom: 8 }}>
              {["Home", "Office", "Gym", "Other"].map((l) => (
                <span
                  key={l}
                  className="chip"
                  style={label === l ? { borderColor: "var(--primary)", color: "var(--text)" } : undefined}
                  onClick={() => setLabel(l)}
                >
                  {l}
                </span>
              ))}
            </div>
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} required />
          </div>
          <LocationInput label="Location" value={picked} onChange={setPicked} placeholder="Search an address…" />
          <button className="btn-primary" disabled={saving} style={{ marginTop: 12 }}>
            {saving ? "Saving…" : "💾 Save place"}
          </button>
        </form>
      </div>

      {places.length === 0 ? (
        <div className="surface empty">
          <span className="big-ico">📍</span>
          No saved places yet.
        </div>
      ) : (
        <div className="grid cols-2">
          {places.map((p) => (
            <div key={p.id} className="ride-card">
              <div className="row-between">
                <strong>
                  {p.label === "Home" ? "🏠" : p.label === "Office" ? "🏢" : "⭐"} {p.label}
                </strong>
                <button className="btn-ghost sm" onClick={() => remove(p.id)}>
                  Remove
                </button>
              </div>
              <span className="muted sm">{p.address}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
