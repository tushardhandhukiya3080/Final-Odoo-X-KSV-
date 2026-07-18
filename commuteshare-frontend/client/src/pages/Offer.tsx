import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Car, Clock, Users, IndianRupee, Route as RouteIcon, ArrowRight, CheckCircle2 } from "lucide-react";
import { api, apiError } from "../lib/api";
import { Card, Spinner, EmptyState } from "../components/ui";
import PlaceInput from "../components/PlaceInput";
import MapView from "../components/MapView";
import { km, mins, inr } from "../lib/format";
import { modeOf } from "../lib/modes";
import type { Point, SavedPlace, Vehicle } from "../lib/types";

function defaultTime() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function Offer() {
  const navigate = useNavigate();
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: async () => (await api.get<Vehicle[]>("/vehicles")).data });
  const places = useQuery({ queryKey: ["places"], queryFn: async () => (await api.get<SavedPlace[]>("/places")).data });

  const [vehicleId, setVehicleId] = useState("");
  const [origin, setOrigin] = useState<Point | null>(null);
  const [dest, setDest] = useState<Point | null>(null);
  const [time, setTime] = useState(defaultTime());
  const [seats, setSeats] = useState(2);
  const [fare, setFare] = useState(80);
  const [preview, setPreview] = useState<{ polyline: string; distanceKm: number; durationMin: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const activeVehicles = vehicles.data?.filter((v) => v.active) ?? [];
  const chosen = activeVehicles.find((v) => v.id === vehicleId) ?? activeVehicles[0];

  async function doPreview() {
    if (!origin || !dest) return toast.error("Pick origin and destination");
    setBusy(true);
    try {
      const { data } = await api.post("/rides/preview-route", { origin, dest });
      setPreview(data);
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function publish() {
    if (!chosen || !origin || !dest) return;
    setBusy(true);
    try {
      await api.post("/rides", {
        vehicleId: chosen.id,
        origin, dest,
        departureTime: new Date(time).toISOString(),
        totalSeats: seats,
        farePerSeat: fare,
      });
      toast.success("Ride published!");
      navigate("/app/trips");
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (vehicles.isLoading) return <Spinner className="text-brand-500" />;

  if (activeVehicles.length === 0)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Offer a Ride</h1>
        <EmptyState
          icon={<Car className="h-10 w-10" />}
          title="Add a vehicle first"
          hint="You need at least one registered vehicle before you can offer a ride."
        />
        <div className="text-center"><button onClick={() => navigate("/app/vehicles")} className="btn-primary">Register a vehicle <ArrowRight className="h-4 w-4" /></button></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Offer a Ride</h1>
        <p className="text-sm text-slate-500">Publish your commute — colleagues along your corridor can book a seat.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <label className="label">Vehicle</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {activeVehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVehicleId(v.id)}
                  className={`ring-1 ring-black/10 p-3 text-left text-sm transition-all ${chosen?.id === v.id ? "bg-brand-100 shadow-brutal-sm" : "bg-white hover:-translate-x-0.5 hover:-translate-y-0.5"}`}
                >
                  <div className="flex items-center gap-2 font-display font-bold uppercase text-black"><span className="text-lg">{modeOf(v.type).emoji}</span>{v.model}</div>
                  <div className="text-xs font-bold text-black/50">{modeOf(v.type).label} · {v.registrationNumber} · {v.seatingCapacity} seats · {v.fuelType}</div>
                </button>
              ))}
            </div>
          </div>

          <PlaceInput label="Origin" value={origin} onChange={(p) => { setOrigin(p); setPreview(null); }} savedPlaces={places.data} />
          <PlaceInput label="Destination" value={dest} onChange={(p) => { setDest(p); setPreview(null); }} savedPlaces={places.data} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label"><Clock className="mr-1 inline h-3 w-3" /> Departure</label>
              <input type="datetime-local" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <label className="label"><Users className="mr-1 inline h-3 w-3" /> Seats offered</label>
              <input type="number" min={1} max={chosen?.seatingCapacity ?? 4} className="input" value={seats} onChange={(e) => setSeats(+e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label"><IndianRupee className="mr-1 inline h-3 w-3" /> Fare per seat</label>
            <input type="number" min={0} className="input" value={fare} onChange={(e) => setFare(+e.target.value)} />
          </div>

          {!preview ? (
            <button onClick={doPreview} disabled={busy || !origin || !dest} className="btn-primary w-full">
              {busy ? <Spinner /> : <><RouteIcon className="h-4 w-4" /> Calculate route</>}
            </button>
          ) : (
            <button onClick={publish} disabled={busy} className="btn-primary w-full">
              {busy ? <Spinner /> : <><CheckCircle2 className="h-4 w-4" /> Confirm & publish</>}
            </button>
          )}
        </Card>

        <div className="space-y-3">
          <MapView polyline={preview?.polyline} origin={origin ?? undefined} dest={dest ?? undefined} height={340} />
          {preview ? (
            <Card className="animate-fade-in">
              <div className="mb-1 text-sm font-bold text-slate-700">Route confirmation</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><div className="text-lg font-bold text-brand-600">{km(preview.distanceKm)}</div><div className="text-xs text-slate-400">distance</div></div>
                <div><div className="text-lg font-bold text-brand-600">{mins(preview.durationMin)}</div><div className="text-xs text-slate-400">est. time</div></div>
                <div><div className="text-lg font-bold text-brand-600">{inr(fare * seats)}</div><div className="text-xs text-slate-400">if full</div></div>
              </div>
              <p className="mt-3 text-xs text-slate-400">Review the highlighted route, then confirm to publish.</p>
            </Card>
          ) : (
            <Card><p className="text-sm text-slate-400">Enter origin & destination and calculate the route to preview it here before publishing.</p></Card>
          )}
        </div>
      </div>
    </div>
  );
}
