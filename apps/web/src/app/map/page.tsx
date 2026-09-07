"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 14 }}>
      Loading map…
    </div>
  ),
});

export default function MapPage() {
  return <MapView />;
}
