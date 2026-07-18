"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

export interface LiveRide {
  id: string;
  driverName: string | null;
  vehicle: string;
  vehicleType: "bike" | "car";
  from: string;
  to: string;
  status: string;
  trackMode: string;
  seatsTotal: number;
  seatsAvailable: number;
  free: boolean;
  isMine: boolean;
  lat: number;
  lng: number;
}

// Marker: emoji by vehicle type (🏍️ bike / 🚗 car), ring colour by state
// (blue = you, teal = free seats, red = full).
function rideIcon(type: "bike" | "car", free: boolean, mine: boolean): L.DivIcon {
  const color = mine ? "#2563eb" : free ? "#0d9488" : "#e11d48";
  const emoji = type === "bike" ? "🏍️" : "🚗";
  return L.divIcon({
    className: "",
    html: `<div style="display:grid;place-items:center;width:32px;height:32px;border-radius:50%;
      background:${color};box-shadow:0 0 0 3px rgba(255,255,255,.85),0 2px 8px rgba(0,0,0,.35);
      font-size:16px">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function Fit({ rides }: { rides: LiveRide[] }) {
  const map = useMap();
  useEffect(() => {
    if (rides.length === 1) map.setView([rides[0].lat, rides[0].lng], 13);
    else if (rides.length > 1) map.fitBounds(L.latLngBounds(rides.map((r) => [r.lat, r.lng])), { padding: [50, 50] });
    // Only refit when the set of rides changes, not on every position tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rides.map((r) => r.id).join(",")]);
  return null;
}

export default function LiveRidesMap({ rides, center }: { rides: LiveRide[]; center: [number, number] }) {
  return (
    <div className="map tall">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {rides.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={rideIcon(r.vehicleType, r.free, r.isMine)}>
            <Popup>
              <div style={{ minWidth: 160, fontFamily: "inherit" }}>
                <strong>{r.isMine ? "You" : r.driverName ?? "Driver"}</strong>
                <div style={{ fontSize: 12, color: "#64748b" }}>{r.vehicle}</div>
                <div style={{ marginTop: 4, fontWeight: 600 }}>{r.from} → {r.to}</div>
                <div style={{ marginTop: 4, fontSize: 12 }}>
                  {r.free ? (
                    <span style={{ color: "#0f766e", fontWeight: 700 }}>● {r.seatsAvailable} of {r.seatsTotal} seats free</span>
                  ) : (
                    <span style={{ color: "#be123c", fontWeight: 700 }}>● Full — taken</span>
                  )}
                </div>
                <div style={{ marginTop: 2, fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>
                  {r.status === "published" ? "waiting" : "en route"} · {r.trackMode}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        <Fit rides={rides} />
      </MapContainer>
    </div>
  );
}
