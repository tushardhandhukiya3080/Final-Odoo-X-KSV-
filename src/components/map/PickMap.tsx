"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const PIN = L.divIcon({
  className: "",
  html: `<span style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">📍</span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface Pt {
  lat: number;
  lng: number;
}

function ClickCapture({ onPick }: { onPick: (p: Pt) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ point }: { point: Pt | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng]);
  }, [point, map]);
  return null;
}

export default function PickMap({
  value,
  onPick,
  center,
  recenter,
}: {
  value: Pt | null;
  onPick: (p: Pt) => void;
  center: [number, number];
  recenter: Pt | null;
}) {
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickCapture onPick={onPick} />
      <Recenter point={recenter} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={PIN}
          draggable
          eventHandlers={{
            dragend(e) {
              const ll = (e.target as L.Marker).getLatLng();
              onPick({ lat: ll.lat, lng: ll.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
