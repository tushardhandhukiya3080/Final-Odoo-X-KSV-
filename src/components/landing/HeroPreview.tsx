import type { ReactNode } from "react";
import { Radio, Star, Navigation, Users, IndianRupee, Leaf, Gauge } from "lucide-react";

// A glassy "live trip" product card — the hero centerpiece. Pure CSS/SVG,
// self-animating (the vehicle dot rides the route via SVG animateMotion).
export default function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* soft glow behind the card */}
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-brand-400/20 blur-2xl" />

      {/* main glass card */}
      <div className="relative rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
        {/* header */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-300/30">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live tracking
          </span>
          <span className="flex items-center gap-1 text-[11px] font-bold text-white/80">
            <Navigation className="h-3.5 w-3.5" /> ETA 12 min
          </span>
        </div>

        {/* mini map */}
        <div className="relative mt-3 h-40 overflow-hidden rounded-2xl ring-1 ring-white/15">
          <svg viewBox="0 0 320 170" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="mapbg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#12306b" />
                <stop offset="1" stopColor="#0a1b45" />
              </linearGradient>
              <path id="route" d="M28 140 C 90 140, 100 60, 170 70 S 260 40, 296 26" fill="none" />
            </defs>
            <rect width="320" height="170" fill="url(#mapbg)" />
            <g stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1">
              {[34, 68, 102, 136].map((y) => <line key={y} x1="0" y1={y} x2="320" y2={y} />)}
              {[64, 128, 192, 256].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="170" />)}
            </g>
            <use href="#route" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="7" strokeLinecap="round" />
            <use href="#route" stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
            <circle cx="28" cy="140" r="6" fill="#34d399" stroke="#062" strokeWidth="1.5" />
            <circle cx="296" cy="26" r="6" fill="#f43f5e" stroke="#600" strokeWidth="1.5" />
            <g>
              <circle r="7" fill="#2563eb" stroke="#fff" strokeWidth="2">
                <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#route" />
                </animateMotion>
              </circle>
            </g>
          </svg>
          <div className="absolute bottom-2 left-2 rounded-lg bg-black/40 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur">
            Whitefield → MG Road
          </div>
        </div>

        {/* driver row */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-brand-300 to-brand-500 text-sm font-bold text-white ring-2 ring-white/25">
              A
            </div>
            <div>
              <div className="text-sm font-bold text-white">Alice Menon</div>
              <div className="text-[11px] text-white/60">🚗 Maruti Swift · KA01AB1234</div>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-white ring-1 ring-white/20">
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> 96
          </div>
        </div>

        {/* chips */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Chip icon={<Users className="h-3.5 w-3.5" />} label="2 seats" />
          <Chip icon={<IndianRupee className="h-3.5 w-3.5" />} label="₹90/seat" />
          <Chip icon={<Radio className="h-3.5 w-3.5" />} label="On corridor" />
        </div>
      </div>

      {/* stat badges */}
      <div className="mt-4 flex gap-3">
        <StatBadge icon={<Gauge className="h-4 w-4" />} grad="from-brand-400 to-brand-600" value="98%" label="Route match" />
        <StatBadge icon={<Leaf className="h-4 w-4" />} grad="from-emerald-300 to-emerald-500" value="5.9 kg" label="CO₂ saved" />
      </div>
    </div>
  );
}

function StatBadge({ icon, grad, value, label }: { icon: ReactNode; grad: string; value: string; label: string }) {
  return (
    <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 shadow-lg backdrop-blur-xl">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b ${grad} text-white shadow-sm`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-extrabold leading-none text-white">{value}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">{label}</div>
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1 rounded-xl bg-white/10 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
      {icon} {label}
    </div>
  );
}
