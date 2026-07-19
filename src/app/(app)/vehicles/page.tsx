"use client";

import { useEffect, useRef, useState } from "react";
import {
  Car, Bike, Plus, Trash2, Fuel, Users, Gauge, Camera, ScanLine,
  CheckCircle2, ShieldCheck, Loader2, AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/client";
import { extractPlate } from "@/lib/plate";
import type { Vehicle, VehicleType } from "@/lib/types";
import type { RcResult } from "@/lib/rc";

const FUELS = ["petrol", "diesel", "cng", "ev"] as const;
type ScanState = "idle" | "scanning" | "found" | "notfound" | "error";
type RcState = RcResult & { phase: "checking" | "done" };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [model, setModel] = useState("");
  const [reg, setReg] = useState("");
  const [type, setType] = useState<VehicleType>("car");
  const [seats, setSeats] = useState(4);
  const [fuel, setFuel] = useState<(typeof FUELS)[number]>("petrol");
  const [mileage, setMileage] = useState(15);

  const [scan, setScan] = useState<ScanState>("idle");
  const [platePreview, setPlatePreview] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [rc, setRc] = useState<RcState | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Verify the plate against the RTO/VAHAN database (Cashfree). When a provider
  // key is configured it becomes the source of truth for "verified".
  async function runRto(plate: string) {
    const p = plate.trim();
    if (!p) return;
    setRc({ phase: "checking", configured: false, ok: false });
    try {
      const r = await api<RcResult>("/api/vehicles/verify-rc", { method: "POST", body: { plate: p } });
      setRc({ phase: "done", ...r });
      if (r.configured) setVerified(r.ok); // RTO is authoritative when set up
    } catch {
      setRc({ phase: "done", configured: false, ok: false, reason: "Verification failed" });
    }
  }

  function pickType(t: VehicleType) {
    setType(t);
    setSeats(t === "bike" ? 1 : 4); // bikes carry a single pillion by default
  }

  function onRegChange(val: string) {
    setReg(val);
    setVerified(false); // typing by hand clears the scanned-verified state
    setRc(null);
    if (scan !== "idle") setScan("idle");
  }

  function resetScan() {
    setScan("idle");
    setVerified(false);
    setRc(null);
    if (platePreview) URL.revokeObjectURL(platePreview);
    setPlatePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // Scan / upload a number-plate image → OCR (tesseract.js) → extract + validate.
  async function onPlateFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (platePreview) URL.revokeObjectURL(platePreview);
    setPlatePreview(URL.createObjectURL(file));
    setScan("scanning");
    setError(null);
    try {
      // Restrict OCR to plate characters + sparse-text mode → far fewer misreads.
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const plate = extractPlate(data.text);
      if (plate) {
        setReg(plate);
        setVerified(true);
        setScan("found");
        runRto(plate); // cross-check the scanned plate against the RTO
      } else {
        setVerified(false);
        setScan("notfound");
      }
    } catch {
      setScan("error");
    }
  }

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
          vehicleType: type,
          seatingCapacity: seats,
          fuelType: fuel,
          mileageKmpl: mileage,
          plateVerified: verified,
        },
      });
      setModel("");
      setReg("");
      pickType("car");
      setMileage(15);
      resetScan();
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
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Vehicle type</label>
              <div className="grid grid-cols-2 gap-3">
                {(["car", "bike"] as const).map((t) => {
                  const on = type === t;
                  const Icon = t === "bike" ? Bike : Car;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => pickType(t)}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 font-display text-sm font-bold uppercase ring-1 ring-black/10 transition ${on ? "bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] text-white shadow-btn" : "bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-md"}`}
                    >
                      <Icon className="h-5 w-5" /> {t}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Number-plate scan / verify */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Verify by number plate</label>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPlateFile} className="hidden" />
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-inner ring-1 ring-black/10">
                <button type="button" onClick={() => fileRef.current?.click()} className="lp-btn bg-gradient-to-b from-[#a6d6fb] to-[#5aadee] text-white">
                  {scan === "scanning" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Scan / upload plate
                </button>
                {platePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={platePreview} alt="number plate" className="h-11 w-20 rounded-lg object-cover ring-1 ring-black/10" />
                )}
                <div className="text-xs font-semibold">
                  {scan === "idle" && <span className="inline-flex items-center gap-1.5 text-slate-400"><ScanLine className="h-3.5 w-3.5" /> Snap or upload the number plate — we read &amp; verify it automatically.</span>}
                  {scan === "scanning" && <span className="inline-flex items-center gap-1.5 text-brand-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading plate…</span>}
                  {scan === "found" && <span className="inline-flex items-center gap-1.5 text-teal-700"><CheckCircle2 className="h-4 w-4" /> Detected &amp; verified: <b>{reg}</b></span>}
                  {scan === "notfound" && <span className="inline-flex items-center gap-1.5 text-amber-700"><AlertTriangle className="h-4 w-4" /> Couldn&apos;t read it — type the plate manually.</span>}
                  {scan === "error" && <span className="inline-flex items-center gap-1.5 text-rose-600"><AlertTriangle className="h-4 w-4" /> Scan failed — enter it manually.</span>}
                </div>
                {scan !== "idle" && (
                  <button type="button" onClick={resetScan} className="ml-auto text-xs font-bold uppercase text-slate-400 transition hover:text-slate-600">Clear</button>
                )}
              </div>

              {/* RTO / VAHAN lookup */}
              {reg.trim().length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-inner ring-1 ring-black/10">
                  <button
                    type="button"
                    onClick={() => runRto(reg)}
                    disabled={rc?.phase === "checking"}
                    className="lp-btn bg-gradient-to-b from-[#2dd4bf] to-[#0d9488] text-white"
                  >
                    {rc?.phase === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify with RTO
                  </button>
                  <div className="min-w-0 flex-1 text-xs font-semibold">
                    {!rc && <span className="text-slate-400">Check this plate against the VAHAN / RTO database.</span>}
                    {rc?.phase === "checking" && <span className="text-brand-600">Checking VAHAN…</span>}
                    {rc?.phase === "done" && !rc.configured && (
                      <span className="text-slate-400">RTO lookup isn&apos;t configured — plate format-checked only.</span>
                    )}
                    {rc?.phase === "done" && rc.configured && rc.ok && (
                      <span className="text-teal-700">✅ RTO verified · <b>{rc.owner}</b> · {rc.model ?? rc.manufacturer} · reg {rc.regDate} · insured till {rc.insuranceUpto} · {rc.rcStatus}</span>
                    )}
                    {rc?.phase === "done" && rc.configured && !rc.ok && (
                      <span className="text-rose-600">⚠️ RTO: {rc.reason}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="label">Model</label>
              <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder={type === "bike" ? "Royal Enfield" : "Honda City"} required />
            </div>
            <div>
              <label className="label">
                Registration number
                {verified && <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-extrabold uppercase text-teal-600"><ShieldCheck className="h-3 w-3" /> verified</span>}
              </label>
              <input className={`input ${verified ? "ring-2 ring-teal-400" : ""}`} value={reg} onChange={(e) => onRegChange(e.target.value)} placeholder="GJ01AB1234" required />
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
                      {v.vehicle_type === "bike" ? <Bike className="h-6 w-6 text-white" /> : <Car className="h-6 w-6 text-white" />}
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
                  {v.plate_verified && (
                    <InfoPill className="bg-gradient-to-b from-[#2dd4bf] to-[#0d9488] text-white ring-black/10">
                      <ShieldCheck className="h-3 w-3" />
                      verified
                    </InfoPill>
                  )}
                  <InfoPill className="bg-gradient-to-b from-[#fcd775] to-[#efab24] text-[#5c3702] ring-black/10">
                    {v.vehicle_type === "bike" ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                    {v.vehicle_type}
                  </InfoPill>
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
