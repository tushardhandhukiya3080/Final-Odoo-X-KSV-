"use client";

import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

export interface MapPoint {
  lat: number;
  lng: number;
  kind?: "origin" | "dest" | "pickup";
}

interface MapViewProps {
  points?: MapPoint[];
  /** OSRM geometry as [lng, lat] pairs. */
  route?: [number, number][];
  /** Live vehicle position. */
  live?: { lat: number; lng: number } | null;
  height?: number;
  tall?: boolean;
}

// divIcons avoid the classic broken-marker-image problem with bundlers.
function dot(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;
      background:${color};box-shadow:0 0 0 3px rgba(255,255,255,.25),0 0 8px ${color}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}
const ICONS = {
  origin: dot("#4f7cff"),
  dest: dot("#43d17a"),
  pickup: dot("#f5a623"),
};
const CAR = L.divIcon({
  className: "",
  html: `<span style="font-size:22px;line-height:1">🚗</span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
}

export default function MapView({
  points = [],
  route,
  live,
  tall = false,
}: MapViewProps) {
  const routeLatLng: [number, number][] = route?.map(([lng, lat]) => [lat, lng]) ?? [];
  const markerPos: [number, number][] = points.map((p) => [p.lat, p.lng]);
  // Guard against a malformed live position (e.g. an event missing lat/lng) —
  // Leaflet throws "Invalid LatLng" and takes the whole page down otherwise.
  const validLive = live && Number.isFinite(live.lat) && Number.isFinite(live.lng) ? live : null;
  const allPos = [...markerPos, ...routeLatLng, ...(validLive ? [[validLive.lat, validLive.lng] as [number, number]] : [])];
  const center: [number, number] = allPos[0] ?? [20.5937, 78.9629]; // India fallback

  return (
    <div className={`map ${tall ? "tall" : ""}`}>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={ICONS[p.kind ?? "origin"]} />
        ))}
        {routeLatLng.length > 0 && (
          <Polyline positions={routeLatLng} pathOptions={{ color: "#4f7cff", weight: 5, opacity: 0.85 }} />
        )}
        {validLive && <Marker position={[validLive.lat, validLive.lng]} icon={CAR} />}
        <FitBounds positions={allPos.length ? allPos : [center]} />
      </MapContainer>
    </div>
  );
}
