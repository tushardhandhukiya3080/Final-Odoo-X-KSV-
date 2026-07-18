"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Organization } from "@/lib/types";

export default function OrgConfigForm() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Organization>("/api/org").then(setOrg).catch((e) => setError((e as Error).message));
  }, []);

  function set<K extends keyof Organization>(k: K, v: Organization[K]) {
    setOrg((o) => (o ? { ...o, [k]: v } : o));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const updated = await api<Organization>("/api/org", {
        method: "PATCH",
        body: {
          name: org.name,
          currency: org.currency,
          fuelPricePerLitre: Number(org.fuel_price_per_litre),
          defaultFarePerKm: Number(org.default_fare_per_km),
          costPerKm: Number(org.cost_per_km),
        },
      });
      setOrg(updated);
      setMsg("Configuration saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!org) return <div className="center-load"><div className="spinner" /></div>;

  return (
    <form className="surface" onSubmit={save}>
      <div className="section-title" style={{ marginTop: 0 }}>Organization configuration</div>
      {error && <div className="error">{error}</div>}
      {msg && <div className="success">{msg}</div>}
      <div className="form-grid two">
        <div className="field">
          <label>Company name</label>
          <input value={org.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="field">
          <label>Currency</label>
          <input value={org.currency} onChange={(e) => set("currency", e.target.value)} maxLength={8} />
        </div>
        <div className="field">
          <label>Fuel price (₹ / litre)</label>
          <input type="number" step="0.01" min={0} value={org.fuel_price_per_litre}
            onChange={(e) => set("fuel_price_per_litre", e.target.value as unknown as number)} />
        </div>
        <div className="field">
          <label>Default fare (₹ / km)</label>
          <input type="number" step="0.01" min={0} value={org.default_fare_per_km}
            onChange={(e) => set("default_fare_per_km", e.target.value as unknown as number)} />
        </div>
        <div className="field">
          <label>Operational cost (₹ / km)</label>
          <input type="number" step="0.01" min={0} value={org.cost_per_km}
            onChange={(e) => set("cost_per_km", e.target.value as unknown as number)} />
        </div>
      </div>
      <button className="btn-primary" disabled={busy} style={{ marginTop: 8 }}>
        {busy ? "Saving…" : "Save configuration"}
      </button>
    </form>
  );
}
