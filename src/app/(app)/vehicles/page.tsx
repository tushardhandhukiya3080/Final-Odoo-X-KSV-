"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Vehicle } from "@/lib/types";

const FUELS = ["petrol", "diesel", "cng", "ev"] as const;

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [model, setModel] = useState("");
  const [reg, setReg] = useState("");
  const [seats, setSeats] = useState(4);
  const [fuel, setFuel] = useState<(typeof FUELS)[number]>("petrol");
  const [mileage, setMileage] = useState(15);

  async function load() {
    try {
      setVehicles(await api<Vehicle[]>("/api/vehicles"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api("/api/vehicles", {
        method: "POST",
        body: {
          model,
          registrationNumber: reg,
          seatingCapacity: seats,
          fuelType: fuel,
          mileageKmpl: mileage,
        },
      });
      setModel("");
      setReg("");
      setSeats(4);
      setMileage(15);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this vehicle?")) return;
    try {
      await api(`/api/vehicles/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>My Vehicles</h1>
        <p>Register a vehicle before you can offer rides.</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="surface" style={{ marginBottom: 20 }}>
        <form className="form-grid two" onSubmit={add}>
          <div className="field">
            <label>Model</label>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Honda City" required />
          </div>
          <div className="field">
            <label>Registration number</label>
            <input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="GJ01AB1234" required />
          </div>
          <div className="field">
            <label>Seating capacity</label>
            <input type="number" min={1} max={20} value={seats} onChange={(e) => setSeats(+e.target.value)} required />
          </div>
          <div className="field">
            <label>Fuel type</label>
            <select value={fuel} onChange={(e) => setFuel(e.target.value as (typeof FUELS)[number])}>
              {FUELS.map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Mileage (km/l or km/kWh)</label>
            <input type="number" min={1} max={100} step="0.1" value={mileage} onChange={(e) => setMileage(+e.target.value)} required />
          </div>
          <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn-primary btn-block" disabled={saving}>
              {saving ? "Adding…" : "+ Add vehicle"}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="center-load">
          <div className="spinner" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="surface empty">
          <span className="big-ico">🚙</span>
          No vehicles yet. Add one above to start offering rides.
        </div>
      ) : (
        <div className="grid cols-2">
          {vehicles.map((v) => (
            <div key={v.id} className="ride-card">
              <div className="row-between">
                <strong>{v.model}</strong>
                {!v.is_active && <span className="pill cancelled">inactive</span>}
              </div>
              <div className="ride-meta">
                <span>🔖 <b>{v.registration_number}</b></span>
                <span>💺 <b>{v.seating_capacity}</b> seats</span>
                <span>⛽ <b>{v.fuel_type.toUpperCase()}</b></span>
                <span>📏 <b>{v.mileage_kmpl}</b> km/l</span>
              </div>
              <div>
                <button className="btn-ghost sm" onClick={() => remove(v.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
