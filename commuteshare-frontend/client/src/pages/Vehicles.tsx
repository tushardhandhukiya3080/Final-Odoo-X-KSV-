import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Car, Plus, Trash2, Fuel, Users } from "lucide-react";
import { api, apiError } from "../lib/api";
import { Card, Spinner, EmptyState, Badge } from "../components/ui";
import { RIDE_MODES, modeOf } from "../lib/modes";
import type { Vehicle } from "../lib/types";

const FUELS = ["PETROL", "DIESEL", "CNG", "EV", "HYBRID"] as const;

export default function Vehicles() {
  const qc = useQueryClient();
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: async () => (await api.get<Vehicle[]>("/vehicles")).data });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ model: "", registrationNumber: "", type: "CAR", seatingCapacity: 4, fuelType: "PETROL", mileageKmpl: 16 });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/vehicles", form);
      toast.success("Vehicle added");
      setOpen(false);
      setForm({ model: "", registrationNumber: "", type: "CAR", seatingCapacity: 4, fuelType: "PETROL", mileageKmpl: 16 });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove(id: string) {
    try { await api.delete(`/vehicles/${id}`); qc.invalidateQueries({ queryKey: ["vehicles"] }); toast.success("Vehicle removed"); }
    catch (e) { toast.error(apiError(e)); }
  }

  const active = vehicles.data?.filter((v) => v.active) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">My Vehicles</h1><p className="text-sm text-slate-500">You need a vehicle to offer rides.</p></div>
        <button onClick={() => setOpen((o) => !o)} className="btn-primary"><Plus className="h-4 w-4" /> Add vehicle</button>
      </div>

      {open && (
        <Card className="animate-fade-in">
          <div className="mb-4">
            <label className="label">Ride mode</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RIDE_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: m.value, seatingCapacity: m.seats }))}
                  className={`flex items-center gap-2 ring-1 ring-black/10 px-3 py-2.5 text-sm font-extrabold uppercase transition-all ${form.type === m.value ? `${m.tint} shadow-brutal-sm` : "bg-white hover:-translate-x-0.5 hover:-translate-y-0.5"}`}
                >
                  <span className="text-lg">{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><label className="label">Model</label><input className="input" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Maruti Swift" required /></div>
            <div><label className="label">Registration no.</label><input className="input" value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} placeholder="KA01AB1234" required /></div>
            <div><label className="label">Seating capacity</label><input type="number" min={1} max={8} className="input" value={form.seatingCapacity} onChange={(e) => set("seatingCapacity", +e.target.value)} /></div>
            <div><label className="label">Fuel type</label><select className="input" value={form.fuelType} onChange={(e) => set("fuelType", e.target.value)}>{FUELS.map((f) => <option key={f}>{f}</option>)}</select></div>
            <div><label className="label">Mileage (km/L)</label><input type="number" min={1} className="input" value={form.mileageKmpl} onChange={(e) => set("mileageKmpl", +e.target.value)} /></div>
            <div className="flex items-end"><button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : "Save vehicle"}</button></div>
          </form>
        </Card>
      )}

      {vehicles.isLoading ? <Spinner className="text-brand-500" /> :
        active.length === 0 ? <EmptyState icon={<Car className="h-10 w-10" />} title="No vehicles yet" hint="Add your car to start offering rides." /> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((v) => (
            <Card key={v.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl text-xl shadow-sm ring-1 ring-black/10 ${modeOf(v.type).tint}`}>{modeOf(v.type).emoji}</div>
                  <div><div className="font-display font-bold uppercase text-black">{v.model}</div><div className="text-xs font-bold text-black/50">{v.registrationNumber}</div></div>
                </div>
                <button onClick={() => remove(v.id)} className="text-black/30 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge className={modeOf(v.type).tint}>{modeOf(v.type).label}</Badge>
                <Badge className="bg-white"><Users className="mr-1 h-3 w-3" />{v.seatingCapacity} seats</Badge>
                <Badge className="bg-white"><Fuel className="mr-1 h-3 w-3" />{v.fuelType}</Badge>
                <Badge className="bg-white">{v.mileageKmpl} km/L</Badge>
              </div>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}
