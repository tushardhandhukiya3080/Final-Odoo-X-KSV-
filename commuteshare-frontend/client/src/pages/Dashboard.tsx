import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search, PlusCircle, Leaf, IndianRupee, Route as RouteIcon, Fuel, ArrowRight,
  Navigation, Wallet as WalletIcon, Car, TreePine, Radio, Zap, CheckCircle2,
} from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "../store/auth";
import { StatusBadge, Skeleton, EmptyState } from "../components/ui";
import { inr, fmtTime } from "../lib/format";
import type { TripStatus } from "../lib/types";

interface Summary {
  currency: string; totalTrips: number; totalDistanceKm: number;
  fuelLitres: number; fuelCost: number; co2SavedKg: number; moneySaved: number;
}
interface TripRow {
  id: string; status: TripStatus; role: "DRIVER" | "PASSENGER"; trackingActive: boolean;
  ride: { originAddr: string; destAddr: string; departureTime: string; driver: { name: string } };
}

const ACTIVE: TripStatus[] = ["RIDE_BOOKED", "TRIP_STARTED", "TRIP_IN_PROGRESS", "TRIP_COMPLETED", "PAYMENT_PENDING"];

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const summary = useQuery({ queryKey: ["summary"], queryFn: async () => (await api.get<Summary>("/reports/summary")).data });
  const trips = useQuery({ queryKey: ["trips", "mine"], queryFn: async () => (await api.get<TripRow[]>("/trips/mine")).data });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: async () => (await api.get<{ balance: number }>("/wallet")).data });
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: async () => (await api.get<{ id: string }[]>("/vehicles")).data });

  const s = summary.data;
  const active = trips.data?.filter((t) => ACTIVE.includes(t.status)) ?? [];
  const offered = active.filter((t) => t.role === "DRIVER");
  const booked = active.filter((t) => t.role === "PASSENGER");
  const completed = (trips.data ?? []).filter((t) => t.status === "PAYMENT_COMPLETED" && t.role === "PASSENGER");
  const nextTrip = [...active].sort((a, b) => +new Date(a.ride.departureTime) - +new Date(b.ride.departureTime))[0];

  // Derived green metrics (car-km avoided ≈ shared distance; a tree absorbs ~21 kg CO₂/yr)
  const co2 = s?.co2SavedKg ?? 0;
  const trees = co2 / 21;
  const greenScore = Math.min(100, Math.round((s?.totalDistanceKm ?? 0) * 0.5 + co2 * 3 + (s?.totalTrips ?? 0) * 3));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase text-black">Hi {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-sm font-semibold text-black/60">Your commute command center.</p>
      </div>

      {/* ── Big action cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        <ActionCard to="/app/find" tint="bg-pop-cyan" icon={<Search className="h-7 w-7" />} title="Find a Ride" sub="Search rides matching your route & time" />
        <ActionCard to="/app/offer" tint="bg-pop-yellow" icon={<PlusCircle className="h-7 w-7" />} title="Offer a Ride" sub="Publish a ride and share your seats" />
      </div>

      {/* ── Overview ──────────────────────────────────────────────── */}
      <Section label="Overview">
        {summary.isLoading ? (
          <div className="bento-grid">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="col-span-1 h-28 lg:col-span-3" />)}</div>
        ) : (
          <div className="bento-grid">
            <OverviewTile className="lg:col-span-3" icon={<RouteIcon className="h-4 w-4" />} label="Upcoming trips" value={active.length} sub={`${offered.length} offered · ${booked.length} booked`} tint="bg-white" />
            <OverviewTile className="lg:col-span-3" icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={completed.length} sub="as passenger" tint="bg-white" />
            <OverviewTile className="lg:col-span-3" icon={<WalletIcon className="h-4 w-4" />} label="Wallet" value={inr(wallet.data?.balance ?? 0)} link={{ to: "/app/wallet", text: "Recharge →" }} tint="bg-pop-lime" />
            <OverviewTile className="lg:col-span-3" icon={<Car className="h-4 w-4" />} label="Vehicles" value={vehicles.data?.length ?? 0} link={{ to: "/app/vehicles", text: "Manage →" }} tint="bg-white" />
          </div>
        )}
      </Section>

      {/* ── Green impact ──────────────────────────────────────────── */}
      <Section label="🌱 Your Green Impact">
        <div className="bento-brand">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-brand-100">Green score</div>
              <div className="font-display text-6xl font-bold leading-none">{greenScore}</div>
              <div className="mt-1 text-sm font-semibold text-brand-100">{s?.totalTrips ?? 0} shared trips · {(s?.totalDistanceKm ?? 0).toFixed(1)} car-km avoided</div>
            </div>
            <div className="text-5xl">🌍</div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <GreenStat icon={<Leaf className="h-4 w-4" />} label="CO₂ saved" value={`${co2.toFixed(1)} kg`} />
            <GreenStat icon={<Fuel className="h-4 w-4" />} label="Fuel saved" value={`${(s?.fuelLitres ?? 0).toFixed(1)} L`} />
            <GreenStat icon={<IndianRupee className="h-4 w-4" />} label="Money saved" value={inr(s?.moneySaved ?? 0)} />
            <GreenStat icon={<TreePine className="h-4 w-4" />} label="Trees / yr" value={trees.toFixed(2)} />
          </div>
        </div>
      </Section>

      {/* ── Next trip ─────────────────────────────────────────────── */}
      <Section label="Next Trip">
        {trips.isLoading ? (
          <Skeleton className="h-24" />
        ) : !nextTrip ? (
          <EmptyState icon={<RouteIcon className="h-10 w-10" />} title="No upcoming trips" hint="Find a ride along your commute or offer one to your colleagues." />
        ) : (
          <Link to={`/app/trips/${nextTrip.id}`} className="bento bento-hover block">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`ring-1 ring-black/10 px-2 py-0.5 text-[11px] font-extrabold uppercase ${nextTrip.role === "DRIVER" ? "bg-pop-cyan" : "bg-pop-pink"}`}>{nextTrip.role}</span>
                <StatusBadge status={nextTrip.status} />
                {nextTrip.trackingActive && <span className="flex items-center gap-1 text-xs font-extrabold uppercase text-emerald-600"><span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" /> live</span>}
              </div>
              <div className="text-xs font-bold text-black/50">{fmtTime(nextTrip.ride.departureTime)}</div>
            </div>
            <div className="mt-3 flex items-center gap-2 font-display text-lg font-bold uppercase">
              {nextTrip.ride.originAddr.split(",")[0]} <ArrowRight className="h-5 w-5" /> {nextTrip.ride.destAddr.split(",")[0]}
            </div>
            <div className="mt-1 text-xs font-semibold text-black/50">driver {nextTrip.ride.driver.name}</div>
          </Link>
        )}
      </Section>

      {/* ── Live activity ─────────────────────────────────────────── */}
      <Section label="Live Activity">
        <LiveActivity />
      </Section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-extrabold uppercase tracking-widest text-black/50">{label}</div>
      {children}
    </div>
  );
}

function ActionCard({ to, tint, icon, title, sub }: { to: string; tint: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link to={to} className="bento bento-hover group flex items-center gap-4">
      <div className={`grid h-16 w-16 shrink-0 place-items-center ring-1 ring-black/10 ${tint} shadow-brutal-sm`}>{icon}</div>
      <div>
        <div className="flex items-center gap-1 font-display text-xl font-bold uppercase">{title} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></div>
        <div className="text-sm font-semibold text-black/60">{sub}</div>
      </div>
    </Link>
  );
}

function OverviewTile({ className = "", icon, label, value, sub, link, tint }: {
  className?: string; icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string;
  link?: { to: string; text: string }; tint: string;
}) {
  return (
    <div className={`bento bento-hover ${tint} ${className}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-black/60">{icon}{label}</div>
      <div className="mt-1 font-display text-3xl font-bold text-black">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-black/50">{sub}</div>}
      {link && <Link to={link.to} className="mt-1 inline-block text-[11px] font-extrabold uppercase text-brand-700 underline decoration-2 underline-offset-2">{link.text}</Link>}
    </div>
  );
}

function GreenStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="ring-1 ring-black/10 bg-white p-3 text-black">
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-black/60">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

interface ActivityEvent { id: number; icon: "zap" | "radio"; text: string; time: string }

function LiveActivity() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const idRef = useRef(1);

  useEffect(() => {
    const socket = getSocket();
    setConnected(socket.connected);
    const onConnect = () => {
      setConnected(true);
      push("radio", "Realtime channel connected");
    };
    const onDisconnect = () => setConnected(false);
    const onLoc = () => push("zap", "Live location update received");
    const onChat = () => push("zap", "New in-trip message");
    const onStatus = (p: { status: string }) => push("zap", `Trip status → ${p.status}`);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("location:update", onLoc);
    socket.on("chat:message", onChat);
    socket.on("trip:status", onStatus);
    if (socket.connected) push("radio", "Realtime channel connected");
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("location:update", onLoc);
      socket.off("chat:message", onChat);
      socket.off("trip:status", onStatus);
    };
    // eslint-disable-next-line
  }, []);

  function push(icon: "zap" | "radio", text: string) {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setEvents((prev) => [{ id: idRef.current++, icon, text, time }, ...prev].slice(0, 8));
  }

  return (
    <div className="bento">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "animate-pulse bg-emerald-500" : "bg-rose-500"}`} />
          <span className="font-display text-sm font-bold uppercase">Live activity</span>
          <span className={`ring-1 ring-black/10 px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${connected ? "bg-pop-lime" : "bg-rose-200"}`}>{connected ? "connected" : "offline"}</span>
        </div>
        <button
          onClick={() => push("zap", "Test event fired")}
          className="ring-1 ring-black/10 bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none"
        >
          <Zap className="mr-1 inline h-3.5 w-3.5" /> Send test event
        </button>
      </div>

      <div className="mt-3 divide-y-2 divide-black/10">
        {events.length === 0 ? (
          <div className="py-6 text-center text-sm font-semibold text-black/40">Waiting for events…</div>
        ) : (
          events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 py-2 animate-fade-in">
              <div className="grid h-8 w-8 shrink-0 place-items-center ring-1 ring-black/10 bg-pop-yellow">
                {e.icon === "zap" ? <Zap className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
              </div>
              <div className="flex-1 text-sm font-bold text-black">{e.text}</div>
              <div className="text-[11px] font-bold text-black/40">{e.time}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
