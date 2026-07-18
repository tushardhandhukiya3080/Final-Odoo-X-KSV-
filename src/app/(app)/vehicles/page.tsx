"use client";

import { useEffect, useState } from "react";
import { Car, Plus, Trash2, Fuel, Users, Gauge } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase text-slate-900">My Vehicles</h1>
        <p className="text-sm font-semibold text-slate-500">Register a vehicle before you can offer rides.</p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Add vehicle */}
      <div className="space-y-3">
        <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Add a vehicle</div>
        <div className="bento">
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={add}>
            <div>
              <label className="label">Model</label>
              <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Honda City" required />
            </div>
            <div>
              <label className="label">Registration number</label>
              <input className="input" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="GJ01AB1234" required />
            </div>
            <div>
              <label className="label">Seating capacity</label>
              <input className="input" type="number" min={1} max={20} value={seats} onChange={(e) => setSeats(+e.target.value)} required />
            </div>
            <div>
              <label className="label">Fuel type</label>
              <select className="input" value={fuel} onChange={(e) => setFuel(e.target.value as (typeof FUELS)[number])}>
                {FUELS.map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mileage (km/l or km/kWh)</label>
              <input className="input" type="number" min={1} max={100} step="0.1" value={mileage} onChange={(e) => setMileage(+e.target.value)} required />
            </div>
            <div className="flex items-end">
              <button className="btn-primary w-full" disabled={saving}>
                <Plus className="h-4 w-4" />
                {saving ? "Adding…" : "Add vehicle"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Garage */}
      <div className="space-y-3">
        <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Your garage</div>
        {loading ? (
          <div className="center-load">
            <div className="spinner" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 py-14 text-center shadow-inner">
            <Car className="mb-3 h-10 w-10 text-slate-300" />
            <div className="font-display text-lg font-bold text-slate-700">No vehicles yet</div>
            <div className="mt-1 max-w-sm text-sm font-medium text-slate-400">Add one above to start offering rides.</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <div key={v.id} className="bento bento-hover">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] shadow-btn ring-1 ring-black/10">
                      <Car className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-display text-lg font-bold uppercase leading-tight text-slate-900">{v.model}</div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{v.registration_number}</div>
                    </div>
                  </div>
                  <button onClick={() => remove(v.id)} aria-label="Remove vehicle" className="text-slate-300 transition hover:text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {!v.is_active && (
                    <span className="rounded-full bg-gradient-to-b from-[#fb7185] to-[#e11d48] px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-white ring-1 ring-black/10">
                      inactive
                    </span>
                  )}
                  <InfoPill className="bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] text-white ring-black/10">
                    <Fuel className="h-3 w-3" />
                    {v.fuel_type.toUpperCase()}
                  </InfoPill>
                  <InfoPill className="bg-white text-slate-600 ring-black/10">
                    <Users className="h-3 w-3" />
                    {v.seating_capacity} seats
                  </InfoPill>
                  <InfoPill className="bg-white text-slate-600 ring-black/10">
                    <Gauge className="h-3 w-3" />
                    {v.mileage_kmpl} km/l
                  </InfoPill>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoPill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ring-1 ${className}`}>
      {children}
    </span>
  );
}
