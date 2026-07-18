import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, Clock, Users, Sparkles, Star, Gauge, CheckCircle2, TrendingUp } from "lucide-react";
import { api, apiError } from "../lib/api";
import { Card, Spinner, EmptyState, Badge } from "../components/ui";
import PlaceInput from "../components/PlaceInput";
import MapView from "../components/MapView";
import { inr, fmtTime, km } from "../lib/format";
import { RIDE_MODES, modeOf, type RideMode } from "../lib/modes";
import type { MatchResult, Point, SavedPlace } from "../lib/types";

function defaultTime() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function Find() {
  const navigate = useNavigate();
  const places = useQuery({ queryKey: ["places"], queryFn: async () => (await api.get<SavedPlace[]>("/places")).data });

  const [origin, setOrigin] = useState<Point | null>(null);
  const [dest, setDest] = useState<Point | null>(null);
  const [time, setTime] = useState(defaultTime());
  const [seats, setSeats] = useState(1);
  const [mode, setMode] = useState<RideMode | "ALL">("ALL");
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<MatchResult | null>(null);
  const [booking, setBooking] = useState(false);

  async function search() {
    if (!origin || !dest) return toast.error("Pick pickup and destination");
    setBusy(true);
    setSelected(null);
    try {
      const { data } = await api.post("/rides/search", {
        origin, dest, departureTime: new Date(time).toISOString(), seats,
      });
      setResults(data.results);
      if (data.results.length === 0) toast("No matching rides on this corridor yet.", { icon: "🔍" });
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function book(m: MatchResult) {
    if (!origin || !dest) return;
    setBooking(true);
    try {
      await api.post("/bookings", {
        rideId: m.ride.id, seats,
        pickup: origin, drop: dest,
      });
      toast.success("Seat booked! Find it in My Trips.");
      navigate("/app/trips");
    } catch (e) { toast.error(apiError(e)); } finally { setBooking(false); }
  }

  const mapRide = selected ?? results?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase text-black">Find a Ride</h1>
        <p className="text-sm font-semibold text-black/60">Smart matching ranks rides by <b>route overlap</b>, <b>time window</b> and <b>seat availability</b> — not exact addresses.</p>
      </div>

      {/* Ride-mode strip */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMode("ALL")}
          className={`ring-1 ring-black/10 px-3.5 py-2 text-sm font-extrabold uppercase transition-all ${mode === "ALL" ? "bg-black text-white shadow-brutal-sm" : "bg-white hover:-translate-x-0.5 hover:-translate-y-0.5"}`}
        >
          All rides
        </button>
        {RIDE_MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`flex items-center gap-2 ring-1 ring-black/10 px-3.5 py-2 text-sm font-extrabold uppercase transition-all ${mode === m.value ? `${m.tint} shadow-brutal-sm` : "bg-white hover:-translate-x-0.5 hover:-translate-y-0.5"}`}
          >
            <span className="text-lg">{m.emoji}</span> {m.label}
          </button>
        ))}
      </div>

      <Card className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <PlaceInput label="Pickup" value={origin} onChange={setOrigin} savedPlaces={places.data} />
        <PlaceInput label="Destination" value={dest} onChange={setDest} savedPlaces={places.data} />
        <div>
          <label className="label"><Clock className="mr-1 inline h-3 w-3" /> When</label>
          <input type="datetime-local" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <div className="w-24">
            <label className="label"><Users className="mr-1 inline h-3 w-3" /> Seats</label>
            <input type="number" min={1} max={6} className="input" value={seats} onChange={(e) => setSeats(+e.target.value)} />
          </div>
          <button onClick={search} disabled={busy} className="btn-primary flex-1 self-end">
            {busy ? <Spinner /> : <><Search className="h-4 w-4" /> Search</>}
          </button>
        </div>
      </Card>

      {results && (() => {
        const shown = mode === "ALL" ? results : results.filter((m) => m.ride.vehicle.type === mode);
        return (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-3">
            <div className="flex items-center gap-2 text-sm font-extrabold uppercase text-black">
              <Sparkles className="h-4 w-4 text-brand-500" />
              {shown.length} matching {shown.length === 1 ? "ride" : "rides"}{mode !== "ALL" && <span className="text-black/50">· {modeOf(mode).label} only</span>}
            </div>
            {shown.length === 0 ? (
              <EmptyState icon={<Search className="h-10 w-10" />} title={mode === "ALL" ? "No matches on this corridor" : `No ${modeOf(mode).label.toLowerCase()} rides here`} hint={mode === "ALL" ? "Try a wider time window, or offer this route yourself." : "Try another ride mode or 'All rides'."} />
            ) : (
              shown.map((m) => (
                <div
                  key={m.ride.id}
                  onClick={() => setSelected(m)}
                  className={`card cursor-pointer p-4 transition ${selected?.ride.id === m.ride.id ? "ring-2 ring-brand-300" : "hover:shadow-md"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{m.ride.driver.name[0]}</div>
                      <div>
                        <div className="font-semibold text-slate-800">{m.ride.driver.name}</div>
                        <div className="text-xs text-slate-400">{m.ride.vehicle.model} · {m.ride.vehicle.registrationNumber}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold text-brand-600"><Star className="h-4 w-4 fill-brand-500 text-brand-500" />{m.match.score}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">match score</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-700">{m.ride.originAddr.split(",")[0]}</span>
                    <span className="text-slate-300">→</span>
                    <span className="font-medium text-slate-700">{m.ride.destAddr.split(",")[0]}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{fmtTime(m.ride.departureTime)} · {km(m.ride.distanceKm)}</div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge className={modeOf(m.ride.vehicle.type).tint}>{modeOf(m.ride.vehicle.type).emoji} {modeOf(m.ride.vehicle.type).label}</Badge>
                    <Badge className="bg-brand-50 text-brand-700"><TrendingUp className="mr-1 h-3 w-3" />{m.match.routeOverlapPct}% overlap</Badge>
                    <Badge className="bg-blue-50 text-blue-700"><Gauge className="mr-1 h-3 w-3" />{m.match.detourKm} km detour</Badge>
                    <Badge className="bg-slate-100 text-slate-600">{m.ride.availableSeats} seats left</Badge>
                    <Badge className="bg-amber-50 text-amber-700">{inr(m.ride.farePerSeat)}/seat</Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-400">{m.match.reasons.join(" · ")}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); book(m); }}
                      disabled={booking}
                      className="btn-primary py-2 text-xs"
                    >
                      {booking ? <Spinner /> : <><CheckCircle2 className="h-4 w-4" /> Book {seats} · {inr(m.ride.farePerSeat * seats)}</>}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-4 space-y-3">
              <MapView
                polyline={mapRide?.ride.routePolyline}
                origin={mapRide ? { lat: mapRide.ride.originLat, lng: mapRide.ride.originLng } : undefined}
                dest={mapRide ? { lat: mapRide.ride.destLat, lng: mapRide.ride.destLng } : undefined}
                height={360}
              />
              {mapRide && (
                <Card>
                  <div className="text-sm font-bold text-slate-700">{mapRide.ride.driver.name}'s route</div>
                  <div className="mt-1 text-xs text-slate-400">Green line is the driver's corridor. Your pickup/drop are matched against it.</div>
                </Card>
              )}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
