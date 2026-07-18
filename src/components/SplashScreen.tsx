"use client";

import { useEffect, useState } from "react";

// Launch screen — shows once per browser session while the app boots, then fades.
export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("rs_splash_seen")) return;
    sessionStorage.setItem("rs_splash_seen", "1");
    setShow(true);
    const t1 = setTimeout(() => setLeaving(true), 1700);
    const t2 = setTimeout(() => setShow(false), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[999] grid place-items-center bg-[#08111f] transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}
      aria-hidden
    >
      <div className="ocean-hero opacity-60" />
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <svg viewBox="0 0 220 130" width="220" height="130" className="text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            {/* body */}
            <path d="M30 96 L30 70 Q30 52 52 50 L150 50 Q168 50 178 70 L188 92 Q190 96 186 96" />
            <path d="M30 96 L188 96" />
            {/* windshield + roof */}
            <path d="M56 50 L66 30 Q68 26 74 26 L134 26 Q140 26 142 30 L152 50" />
            {/* 3 riders */}
            <circle cx="82" cy="40" r="7" />
            <circle cx="104" cy="40" r="7" />
            <circle cx="126" cy="40" r="7" />
            {/* wheels */}
            <circle cx="66" cy="98" r="14" fill="#08111f" />
            <circle cx="152" cy="98" r="14" fill="#08111f" />
            {/* headlights */}
            <path d="M176 78 L186 78" />
            <path d="M40 78 L52 78" />
          </g>
        </svg>
        <div>
          <div className="font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">Ride Together</div>
          <div className="font-display text-4xl font-bold uppercase tracking-tight text-transparent sm:text-5xl" style={{ backgroundImage: "linear-gradient(90deg,#7dd3fc,#5eead4)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>
            Save Together
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-sky-300 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-teal-300 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-brand-300 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
