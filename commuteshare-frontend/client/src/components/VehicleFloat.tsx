// Animated hero "traffic" — 2 cars 🚗 + 2 bikes 🏍️ driving across with a bob/tilt.
// Pure DOM/CSS (no WebGL), so it's cheap and reliable. Negative delays stagger
// them so they're already spread across the width on first paint.
const VEHICLES = [
  { e: "🚗", top: "15%", size: 60, dur: 21, delay: -3, dir: "ltr" as const },
  { e: "🏍️", top: "60%", size: 46, dur: 15, delay: -9, dir: "rtl" as const },
  { e: "🚗", top: "78%", size: 52, dur: 27, delay: -16, dir: "ltr" as const },
  { e: "🏍️", top: "36%", size: 40, dur: 18, delay: -6, dir: "rtl" as const },
];

export default function VehicleFloat() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {VEHICLES.map((v, i) => (
        <span
          key={i}
          className="absolute left-0 will-change-transform"
          style={{ top: v.top, animation: `vf-drive-${v.dir} ${v.dur}s linear ${v.delay}s infinite` }}
        >
          <span className="block" style={{ animation: `vf-bob ${3 + i * 0.5}s ease-in-out infinite` }}>
            <span
              className="block select-none leading-none"
              style={{
                fontSize: `${v.size}px`,
                // emoji face left by default → flip when driving right
                transform: v.dir === "ltr" ? "scaleX(-1)" : "none",
                filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.45))",
              }}
            >
              {v.e}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
