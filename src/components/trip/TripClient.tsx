"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { useAppEvents } from "@/components/EventsProvider";
import DynamicMap from "@/components/map/DynamicMap";
import ChatPanel from "./ChatPanel";
import PaymentPanel from "./PaymentPanel";
import type { ChatMessage, TripDetail } from "./types";

const LIFECYCLE = [
  { key: "booked", label: "Ride booked" },
  { key: "started", label: "Trip started" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Trip completed" },
  { key: "paid", label: "Payment completed" },
];

export default function TripClient({
  id,
  currentUserId,
  trackMode = "gps",
}: {
  id: string;
  currentUserId: string;
  trackMode?: "manual" | "gps";
}) {
  const [d, setD] = useState<TripDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [live, setLive] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastPing = useRef(0);

  const reload = useCallback(async () => {
    try {
      const detail = await api<TripDetail>(`/api/rides/${id}`);
      setD(detail);
      if (detail.ride.live) setLive(detail.ride.live);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    reload();
    api<ChatMessage[]>(`/api/rides/${id}/messages`).then(setMessages).catch(() => {});
  }, [id, reload]);

  // Safety net: if a live event was ever missed (reconnect gap, was on another
  // tab), re-fetch whenever this tab regains focus — so switching between the
  // driver and passenger windows always shows the latest status (e.g. the
  // "Payment due" panel right after the driver completes the trip).
  useEffect(() => {
    const refetch = () => {
      if (!document.hidden) reload();
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", refetch);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", refetch);
    };
  }, [reload]);

  // Live updates for this trip (location, chat, lifecycle) via the shared stream.
  useAppEvents((ev) => {
    if (ev.data?.rideId !== id) return;
    if (ev.type === "trip.location" || ev.type === "trip.progress") {
      const lat = ev.data.lat as number;
      const lng = ev.data.lng as number;
      if (Number.isFinite(lat) && Number.isFinite(lng)) setLive({ lat, lng });
    } else if (ev.type === "chat.message") {
      setMessages((prev) => [
        ...prev,
        {
          senderId: ev.data!.senderId as string,
          senderName: ev.data!.senderName as string,
          body: ev.data!.body as string,
          at: ev.data!.at as string,
        },
      ]);
    } else if (["ride.booked", "trip.started", "trip.completed", "ride.cancelled"].includes(ev.type)) {
      reload();
    }
  });

  // Driver shares GPS while the trip is live (throttled to ~4s).
  // Only in GPS mode — for manual rides the "Reached next stop" progress owns the
  // position, so auto-pinging the phone's real location would fight it.
  useEffect(() => {
    if (trackMode !== "gps") return;
    if (!d?.isDriver) return;
    const active = d.ride.status === "started" || d.ride.status === "in_progress";
    if (!active || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastPing.current < 4000) return;
        lastPing.current = now;
        api(`/api/rides/${id}/ping`, {
          method: "POST",
          body: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [trackMode, d?.isDriver, d?.ride.status, id]);

  async function setStatus(status: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/rides/${id}/status`, { method: "POST", body: { status } });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function raiseSos() {
    if (!confirm("Send an emergency SOS alert to everyone on this trip?")) return;
    const send = (lat?: number, lng?: number) =>
      api(`/api/rides/${id}/sos`, { method: "POST", body: { lat, lng } })
        .then(() => alert("🆘 SOS sent — participants have been alerted."))
        .catch((e) => setError((e as Error).message));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => send(p.coords.latitude, p.coords.longitude),
        () => send(),
      );
    } else {
      send();
    }
  }

  async function cancelBooking() {
    if (!d?.myBooking || !confirm("Cancel your booking?")) return;
    setBusy(true);
    try {
      await api(`/api/bookings/${d.myBooking.bookingId}/cancel`, { method: "POST" });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!d) {
    return (
      <div className="center-load">
        <div className="spinner" />
      </div>
    );
  }

  const { ride, driver, vehicle, passengers, isDriver, myBooking } = d;
  const active = ride.status === "started" || ride.status === "in_progress";
  const stepIndex = stepFor(ride.status, myBooking?.paymentStatus, passengers);
  const otherPhone = isDriver ? passengers.find((p) => p.phone)?.phone : driver.phone;

  return (
    <>
      <div className="page-head row-between">
        <div>
          <h1>Trip details</h1>
          <p>
            {ride.originLabel.split(",")[0]} → {ride.destLabel.split(",")[0]}
          </p>
        </div>
        <span className={`pill ${ride.status}`}>{ride.status.replace("_", " ")}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="grid cols-2">
        <div className="surface">
          <div className="section-title" style={{ marginTop: 0 }}>
            {active ? "🔴 Live tracking" : "Route"}
          </div>
          <DynamicMap
            tall
            points={[
              { lat: ride.origin.lat, lng: ride.origin.lng, kind: "origin" },
              { lat: ride.dest.lat, lng: ride.dest.lng, kind: "dest" },
            ]}
            route={ride.route}
            live={active ? live : null}
          />
          {active && (
            <p className="muted sm" style={{ marginTop: 10 }}>
              {isDriver ? "📡 Sharing your location…" : live ? "🚗 Vehicle location updating live" : "Waiting for driver location…"}
              {" · "}~{Math.round(ride.durationMin)} min · {ride.distanceKm} km
            </p>
          )}
        </div>

        <div>
          <div className="surface" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Trip</div>
            <div className="panel" style={{ border: "none", padding: 0 }}>
              <div className="row"><span className="k">Departs</span><span>{new Date(ride.departAt).toLocaleString()}</span></div>
              <div className="row"><span className="k">Distance</span><span>{ride.distanceKm} km · ~{Math.round(ride.durationMin)} min</span></div>
              <div className="row"><span className="k">Fare / seat</span><span className="fare">₹{ride.farePerSeat}</span></div>
              <div className="row"><span className="k">Seats</span><span>{ride.seatsAvailable}/{ride.seatsTotal} free</span></div>
              <div className="row"><span className="k">{isDriver ? "Vehicle" : "Driver"}</span>
                <span>{isDriver ? `${vehicle.model} · ${vehicle.registrationNumber}` : driver.name ?? "—"}</span>
              </div>
            </div>
            {otherPhone && (
              <div className="btn-row" style={{ marginTop: 14 }}>
                <a className="btn-ghost" style={{ padding: "10px 16px" }} href={`tel:${otherPhone}`}>📞 Call</a>
              </div>
            )}
          </div>

          <div className="surface">
            <div className="section-title" style={{ marginTop: 0 }}>Progress</div>
            <div className="timeline">
              {LIFECYCLE.map((s, i) => (
                <div key={s.key} className={`tl-step ${i < stepIndex ? "done" : i === stepIndex ? "current" : "pending"}`}>
                  <span className="tl-dot" />
                  <span className="tl-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Driver / passenger actions */}
      <div className="surface" style={{ marginTop: 16 }}>
        <div className="row-between">
          <strong>Actions</strong>
          <div className="btn-row">
            {active && (
              <button className="btn-danger sos-btn" onClick={raiseSos}>🆘 SOS</button>
            )}
            {isDriver && ride.status === "published" && (
              <>
                <button className="btn-success" onClick={() => setStatus("started")} disabled={busy}>🚦 Start trip</button>
                <button className="btn-ghost" style={{ padding: "10px 16px" }} onClick={() => setStatus("cancelled")} disabled={busy}>Cancel ride</button>
              </>
            )}
            {isDriver && ride.status === "started" && (
              <>
                <button className="btn-primary" onClick={() => setStatus("in_progress")} disabled={busy}>▶ In progress</button>
                <button className="btn-success" onClick={() => setStatus("completed")} disabled={busy}>🏁 Complete</button>
              </>
            )}
            {isDriver && ride.status === "in_progress" && (
              <button className="btn-success" onClick={() => setStatus("completed")} disabled={busy}>🏁 Complete trip</button>
            )}
            {!isDriver && ride.status === "published" && (
              <button className="btn-ghost" style={{ padding: "10px 16px" }} onClick={cancelBooking} disabled={busy}>Cancel booking</button>
            )}
            {ride.status === "completed" && myBooking?.paymentStatus === "completed" && (
              <span className="pill paid">✅ Paid</span>
            )}
          </div>
        </div>
      </div>

      {/* Passenger payment */}
      {!isDriver && ride.status === "completed" && myBooking && myBooking.paymentStatus === "pending" && (
        <div style={{ marginTop: 16 }}>
          <PaymentPanel bookingId={myBooking.bookingId} amount={myBooking.fareAmount} onPaid={reload} />
        </div>
      )}

      {/* Driver: passenger manifest */}
      {isDriver && (
        <div className="surface" style={{ marginTop: 16 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Passengers ({passengers.length})</div>
          {passengers.length === 0 ? (
            <p className="muted sm">No bookings yet.</p>
          ) : (
            passengers.map((p) => (
              <div key={p.bookingId} className="txn">
                <div>
                  <strong>{p.name}</strong>
                  <div className="muted sm">{p.seats} seat(s) · pickup {p.pickupLabel.split(",")[0]}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="fare" style={{ fontSize: "1rem" }}>₹{p.fareAmount}</div>
                  <span className={`pill ${p.paymentStatus === "completed" ? "paid" : "pending"}`}>
                    {p.paymentStatus === "completed" ? "paid" : "unpaid"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Chat */}
      <div style={{ marginTop: 16 }}>
        <div className="section-title">💬 Chat</div>
        <ChatPanel rideId={id} currentUserId={currentUserId} messages={messages} />
      </div>
    </>
  );
}

function stepFor(
  status: string,
  paymentStatus: string | undefined,
  passengers: TripDetail["passengers"],
): number {
  if (status === "cancelled") return -1;
  if (status === "completed") {
    const paid =
      paymentStatus === "completed" ||
      (passengers.length > 0 && passengers.every((p) => p.paymentStatus === "completed"));
    return paid ? 5 : 4;
  }
  if (status === "in_progress") return 3;
  if (status === "started") return 2;
  return 1; // published/booked
}
