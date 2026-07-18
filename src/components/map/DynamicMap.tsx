"use client";

// SSR-safe wrapper: Leaflet touches `window`, so the map only loads client-side.
import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="map center-load">
      <div className="spinner" />
    </div>
  ),
});

export default DynamicMap;
