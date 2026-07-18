import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Phone, Send, Play, Navigation, Flag, CheckCircle2, MapPin, Clock, Wallet as WalletIcon,
  Banknote, CreditCard, Smartphone, ArrowLeft, Radio, Car,
} from "lucide-react";
import { api, apiError } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "../store/auth";
import { Card, Spinner, StatusBadge, Badge } from "../components/ui";
import MapView from "../components/MapView";
import { decodePolyline } from "../lib/polyline";
import { fmtShort, inr, km, mins } from "../lib/format";
import { modeOf, type RideMode } from "../lib/modes";
import type { TripStatus } from "../lib/types";

interface TripDetail {
  id: string; status: TripStatus; role: "DRIVER" | "PASSENGER"; trackingActive: boolean;
  distanceKm: number; durationMin: number;
  liveLocation: { lat: number; lng: number } | null;
  ride: {
    id: string; originAddr: string; destAddr: string; originLat: number; originLng: number;
    destLat: number; destLng: number; routePolyline: string; departureTime: string; farePerSeat: number;
    driver: { id: string; name: string; phone: string | null };
    vehicle: { model: string; registrationNumber: string; fuelType: string; type: RideMode };
    bookings: {
      id: string; seatsBooked: number; fareAmount: number; pickupAddr: string;
      passenger: { id: string; name: string; phone: string | null };
      payment: { status: string; method: string } | null;
    }[];
  };
  messages: { id: string; body: string; sentAt: string; sender: { id: string; name: string } }[];
}

const NEXT: Partial<Record<TripStatus, { to: TripStatus; label: string; icon: any }>> = {
  RIDE_BOOKED: { to: "TRIP_STARTED", label: "Start trip", icon: Play },
  TRIP_STARTED: { to: "TRIP_IN_PROGRESS", label: "Mark in progress", icon: Navigation },
  TRIP_IN_PROGRESS: { to: "TRIP_COMPLETED", label: "Complete trip", icon: Flag },
};

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<TripDetail["messages"]>([]);
  const [vehicle, setVehicle] = useState<{ lat: number; lng: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const simRef = useRef<ReturnType<typeof setInterval>>();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const route = useMemo(() => (trip ? decodePolyline(trip.ride.routePolyline) : []), [trip?.ride.routePolyline]);

  async function load() {
    try {
      const { data } = await api.get<TripDetail>(`/trips/${id}`);
      setTrip(data);
      setMessages(data.messages);
      if (data.liveLocation) setVehicle(data.liveLocation);
    } catch (e) {
      toast.error(apiError(e));
      navigate("/app/trips");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Socket wiring
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit("trip:join", id, () => {});
    const onLoc = (p: { tripId: string; lat: number; lng: number }) => {
      if (p.tripId === id) setVehicle({ lat: p.lat, lng: p.lng });
    };
    const onMsg = (m: TripDetail["messages"][number] & { tripId: string }) => {
      if (m.tripId === id) setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    };
    const onStatus = (p: { tripId: string; status: TripStatus }) => {
      if (p.tripId === id) { setTrip((t) => (t ? { ...t, status: p.status } : t)); load(); }
    };
    socket.on("location:update", onLoc);
    socket.on("chat:message", onMsg);
    socket.on("trip:status", onStatus);
    return () => { socket.off("location:update", onLoc); socket.off("chat:message", onMsg); socket.off("trip:status", onStatus); };
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Stop simulation when tracking is no longer active
  useEffect(() => {
    if (trip && !["TRIP_STARTED", "TRIP_IN_PROGRESS"].includes(trip.status) && simulating) stopSim();
    // eslint-disable-next-line
  }, [trip?.status]);

  useEffect(() => () => stopSim(), []);

  function startSim() {
    if (!trip || route.length < 2) return;
    setSimulating(true);
    const socket = getSocket();
    let i = 0;
    simRef.current = setInterval(() => {
      if (i >= route.length) { stopSim(); return; }
      const [lat, lng] = route[i];
      socket.emit("location:update", { tripId: trip.id, lat, lng });
      setVehicle({ lat, lng });
      i += Math.max(1, Math.floor(route.length / 60)); // ~60 steps end-to-end
    }, 900);
  }
  function stopSim() { clearInterval(simRef.current); setSimulating(false); }

  async function advance(to: TripStatus) {
    if (!trip) return;
    setBusy(true);
    try {
      await api.post(`/trips/${trip.id}/advance`, { to });
      await load();
      qc.invalidateQueries({ queryKey: ["trips"] });
      if (to === "TRIP_STARTED") { toast.success("Trip started — sharing live location"); startSim(); }
      if (to === "TRIP_COMPLETED") { stopSim(); setVehicle(null); toast.success("Trip completed"); }
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  function sendMsg() {
    if (!draft.trim() || !trip) return;
    getSocket().emit("chat:send", { tripId: trip.id, body: draft });
    setDraft("");
  }

  // ETA from current vehicle position to destination (remaining route length).
  const eta = useMemo(() => {
    if (!trip || !vehicle) return null;
    const dest = { lat: trip.ride.destLat, lng: trip.ride.destLng };
    const remainKm = haversine(vehicle, dest);
    return Math.max(1, Math.round((remainKm / 28) * 60)); // ~28 km/h urban
  }, [vehicle, trip]);

  if (loading || !trip) return <div className="grid place-items-center py-20"><Spinner className="text-brand-500" /></div>;

  const isDriver = trip.role === "DRIVER";
  const myBooking = trip.ride.bookings.find((b) => b.passenger.id === me?.id);
  const next = NEXT[trip.status];
  const counterpart = isDriver ? trip.ride.bookings[0]?.passenger : trip.ride.driver;
  const tracking = ["TRIP_STARTED", "TRIP_IN_PROGRESS"].includes(trip.status);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("/app/trips")} className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> My Trips</button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">{trip.ride.originAddr.split(",")[0]} → {trip.ride.destAddr.split(",")[0]}</h1>
            <StatusBadge status={trip.status} />
          </div>
          <div className="mt-1 text-sm text-slate-500">{modeOf(trip.ride.vehicle.type).emoji} {modeOf(trip.ride.vehicle.type).label} · {trip.ride.vehicle.model} · {trip.ride.vehicle.registrationNumber} · departs {fmtShort(trip.ride.departureTime)}</div>
        </div>
        <div className="flex gap-2">
          {isDriver && next && (
            <button onClick={() => advance(next.to)} disabled={busy} className="btn-primary">
              {busy ? <Spinner /> : <><next.icon className="h-4 w-4" /> {next.label}</>}
            </button>
          )}
          {isDriver && tracking && (
            <button onClick={simulating ? stopSim : startSim} className={simulating ? "btn-ghost" : "btn-outline"}>
              <Radio className={`h-4 w-4 ${simulating ? "animate-pulse text-emerald-500" : ""}`} /> {simulating ? "Stop sim" : "Simulate drive"}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Map + tracking */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <MapView
              polyline={trip.ride.routePolyline}
              origin={{ lat: trip.ride.originLat, lng: trip.ride.originLng }}
              dest={{ lat: trip.ride.destLat, lng: trip.ride.destLng }}
              vehicle={tracking ? vehicle : null}
              followVehicle={tracking && !!vehicle}
              height={420}
            />
            {tracking && (
              <div className="absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-md">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" /> Live tracking
                {eta != null && <span className="text-slate-500">· ETA {mins(eta)}</span>}
              </div>
            )}
            {!tracking && trip.status === "RIDE_BOOKED" && (
              <div className="absolute inset-x-0 bottom-3 z-[500] mx-auto w-max rounded-full bg-slate-800/80 px-4 py-1.5 text-xs font-medium text-white">
                Live tracking begins when the driver starts the trip
              </div>
            )}
          </div>

          {/* Route facts */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="!p-3 text-center"><MapPin className="mx-auto mb-1 h-4 w-4 text-brand-500" /><div className="text-sm font-bold">{km(trip.distanceKm || 0)}</div><div className="text-[11px] text-slate-400">distance</div></Card>
            <Card className="!p-3 text-center"><Clock className="mx-auto mb-1 h-4 w-4 text-blue-500" /><div className="text-sm font-bold">{mins(trip.durationMin || 0)}</div><div className="text-[11px] text-slate-400">duration</div></Card>
            <Card className="!p-3 text-center"><Car className="mx-auto mb-1 h-4 w-4 text-violet-500" /><div className="text-sm font-bold">{trip.ride.bookings.reduce((a, b) => a + b.seatsBooked, 0)}</div><div className="text-[11px] text-slate-400">seats booked</div></Card>
          </div>

          {/* Payment (passenger) */}
          {!isDriver && myBooking && ["TRIP_COMPLETED", "PAYMENT_PENDING"].includes(trip.status) && myBooking.payment?.status !== "PAID" && (
            <PaymentPanel bookingId={myBooking.id} amount={myBooking.fareAmount} onPaid={load} />
          )}
          {!isDriver && myBooking?.payment?.status === "PAID" && (
            <Card className="flex items-center gap-2 bg-brand-50 text-brand-700"><CheckCircle2 className="h-5 w-5" /> Payment complete via {myBooking.payment.method} — {inr(myBooking.fareAmount)}</Card>
          )}
        </div>

        {/* Sidebar: participants + chat */}
        <div className="space-y-4">
          <Card>
            <div className="text-sm font-bold text-slate-700">{isDriver ? "Passengers" : "Driver"}</div>
            {isDriver ? (
              trip.ride.bookings.length === 0 ? <div className="mt-2 text-sm text-slate-400">No bookings yet</div> :
              trip.ride.bookings.map((b) => (
                <div key={b.id} className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 font-bold text-violet-700">{b.passenger.name[0]}</div>
                    <div><div className="text-sm font-semibold text-slate-700">{b.passenger.name}</div><div className="text-[11px] text-slate-400">{b.seatsBooked} seat(s) · {inr(b.fareAmount)}</div></div>
                  </div>
                  <div className="flex items-center gap-1">
                    {b.payment?.status === "PAID" ? <Badge className="bg-brand-50 text-brand-700">paid</Badge> : <Badge className="bg-amber-50 text-amber-700">due</Badge>}
                    {b.passenger.phone && <a href={`tel:${b.passenger.phone}`} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-brand-50"><Phone className="h-4 w-4" /></a>}
                  </div>
                </div>
              ))
            ) : (
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{trip.ride.driver.name[0]}</div>
                  <div><div className="text-sm font-semibold text-slate-700">{trip.ride.driver.name}</div><div className="text-[11px] text-slate-400">{trip.ride.vehicle.model}</div></div>
                </div>
                {trip.ride.driver.phone && <a href={`tel:${trip.ride.driver.phone}`} className="btn-outline py-2 text-xs"><Phone className="h-4 w-4" /> Call</a>}
              </div>
            )}
          </Card>

          {/* Chat */}
          <Card className="flex h-[360px] flex-col !p-0">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-700">In-trip chat</div>
            <div className="flex-1 space-y-2 overflow-auto px-3 py-3">
              {messages.length === 0 && <div className="mt-8 text-center text-xs text-slate-400">No messages yet. Say hi 👋</div>}
              {messages.map((m) => {
                const mine = m.sender.id === me?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-700"}`}>
                      {!mine && <div className="text-[10px] font-semibold opacity-70">{m.sender.name}</div>}
                      {m.body}
                      <div className={`text-[9px] ${mine ? "text-brand-100" : "text-slate-400"}`}>{fmtShort(m.sentAt)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="flex items-center gap-2 border-t border-slate-100 p-2">
              <input className="input" placeholder="Type a message…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMsg()} />
              <button onClick={sendMsg} className="btn-primary !px-3"><Send className="h-4 w-4" /></button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function PaymentPanel({ bookingId, amount, onPaid }: { bookingId: string; amount: number; onPaid: () => void }) {
  const me = useAuth((s) => s.user);
  const [busy, setBusy] = useState<string | null>(null);

  async function pay(method: "CASH" | "WALLET" | "CARD" | "UPI") {
    setBusy(method);
    try {
      const { data } = await api.post(`/payments/booking/${bookingId}`, { method });
      if (data.status === "PAID") {
        toast.success(`Paid ${inr(amount)} via ${method}`);
        onPaid();
        return;
      }
      if (data.status === "ORDER_CREATED") {
        const ok = await loadRazorpay();
        if (!ok) return toast.error("Could not load Razorpay checkout");
        const rzp = new (window as any).Razorpay({
          key: data.keyId,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "CommuteShare",
          description: "Ride fare",
          order_id: data.order.id,
          prefill: { name: me?.name, email: me?.email },
          theme: { color: "#2563eb" },
          handler: async (resp: any) => {
            try {
              await api.post("/payments/verify", { bookingId, ...resp });
              toast.success("Payment verified");
              onPaid();
            } catch (e) { toast.error(apiError(e)); }
          },
        });
        rzp.on("payment.failed", () => toast.error("Payment failed"));
        rzp.open();
      }
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(null); }
  }

  const opts = [
    { m: "WALLET" as const, label: "Wallet", icon: WalletIcon },
    { m: "UPI" as const, label: "UPI", icon: Smartphone },
    { m: "CARD" as const, label: "Card", icon: CreditCard },
    { m: "CASH" as const, label: "Cash", icon: Banknote },
  ];

  return (
    <Card className="border-2 border-amber-200 bg-amber-50/40">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-700">Complete payment</div>
        <div className="text-lg font-bold text-brand-600">{inr(amount)}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {opts.map((o) => (
          <button key={o.m} onClick={() => pay(o.m)} disabled={!!busy} className="btn-outline flex-col !py-3 text-xs">
            {busy === o.m ? <Spinner /> : <o.icon className="h-5 w-5 text-brand-600" />}
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Card / UPI run through Razorpay test mode (server-verified signature). Wallet debits your balance and credits the driver.</p>
    </Card>
  );
}
