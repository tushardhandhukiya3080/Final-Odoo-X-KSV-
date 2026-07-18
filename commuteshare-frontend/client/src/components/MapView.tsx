import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { decodePolyline } from "../lib/polyline";

export interface LatLng {
  lat: number;
  lng: number;
}

function pinIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%)">
      <div style="background:${color};width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.3);display:grid;place-items:center;border:2px solid #fff">
        <span style="transform:rotate(45deg);font-size:12px;font-weight:700;color:#fff">${label}</span>
      </div></div>`,
    iconSize: [26, 26],
    iconAnchor: [0, 0],
  });
}

function vehicleIcon() {
  return L.divIcon({
    className: "vehicle-marker",
    html: `<div style="transform:translate(-50%,-50%)">
      <div style="background:#2563eb;width:34px;height:34px;border-radius:50%;box-shadow:0 0 0 6px rgba(37,99,235,.25),0 2px 8px rgba(0,0,0,.35);display:grid;place-items:center;border:2px solid #fff">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M18.9 6.5A1.5 1.5 0 0017.5 5.5h-11A1.5 1.5 0 005.1 6.5L3 12v7a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-7l-2.1-5.5zM6.5 16A1.5 1.5 0 118 14.5 1.5 1.5 0 016.5 16zm11 0a1.5 1.5 0 111.5-1.5 1.5 1.5 0 01-1.5 1.5zM5 11l1.5-4h11L19 11z"/></svg>
      </div></div>`,
    iconSize: [34, 34],
    iconAnchor: [0, 0],
  });
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, JSON.stringify(points)]);
  return null;
}

function Recenter({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.8 });
  }, [map, pos?.lat, pos?.lng]);
  return null;
}

interface Props {
  polyline?: string;
  origin?: LatLng & { label?: string };
  dest?: LatLng & { label?: string };
  vehicle?: LatLng | null;
  followVehicle?: boolean;
  height?: number | string;
  className?: string;
}

export default function MapView({ polyline, origin, dest, vehicle, followVehicle, height = 360, className = "" }: Props) {
  const route = useMemo<[number, number][]>(() => (polyline ? decodePolyline(polyline) : []), [polyline]);
  const fitPts: LatLng[] = [];
  if (origin) fitPts.push(origin);
  if (dest) fitPts.push(dest);
  route.forEach(([lat, lng]) => fitPts.push({ lat, lng }));
  if (vehicle) fitPts.push(vehicle);

  const center: [number, number] = origin ? [origin.lat, origin.lng] : [12.9716, 77.5946];

  return (
    <div className={`overflow-hidden rounded-2xl ring-1 ring-slate-200 ${className}`} style={{ height }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route.length > 1 && <Polyline positions={route} pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85 }} />}
        {origin && <Marker position={[origin.lat, origin.lng]} icon={pinIcon("#2563eb", "A")} />}
        {dest && <Marker position={[dest.lat, dest.lng]} icon={pinIcon("#dc2626", "B")} />}
        {vehicle && <Marker position={[vehicle.lat, vehicle.lng]} icon={vehicleIcon()} />}
        {!followVehicle && <FitBounds points={fitPts} />}
        {followVehicle && <Recenter pos={vehicle ?? null} />}
      </MapContainer>
    </div>
  );
}
