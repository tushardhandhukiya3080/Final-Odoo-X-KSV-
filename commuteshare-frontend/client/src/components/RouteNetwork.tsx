// A mature, on-theme hero backdrop: a "live commute network" — glowing nodes
// linked by dashed route lines, with light-pulses travelling along each route
// (echoing the moving dot in the product preview). Pure SVG/CSS, no WebGL.

const NODES: [number, number][] = [
  [140, 600], [360, 470], [300, 700], [560, 560], [720, 380],
  [520, 250], [880, 300], [1040, 470], [960, 660], [1140, 360],
];

const PATHS = [
  { id: "r1", d: "M140,600 C 240,540 300,510 360,470 C 460,410 490,520 560,560 C 640,600 680,470 720,380", dur: 9 },
  { id: "r2", d: "M520,250 C 600,300 660,340 720,380 C 800,430 820,450 880,300 C 940,360 1000,420 1040,470", dur: 11 },
  { id: "r3", d: "M300,700 C 420,660 480,600 560,560 C 680,500 780,420 880,300", dur: 10 },
  { id: "r4", d: "M1040,470 C 1090,540 1120,600 960,660 C 1010,560 1080,460 1140,360", dur: 12 },
  { id: "r5", d: "M360,470 C 420,380 470,320 520,250", dur: 7 },
];

const COLORS_DARK = ["#7dd3fc", "#2dd4bf", "#60a5fa", "#38bdf8", "#5eead4"];
const COLORS_LIGHT = ["#2563eb", "#0d9488", "#1d4ed8", "#0891b2", "#0f766e"];

// dark = bright glowing network for dark canvases; light = muted navy version for light pages.
export default function RouteNetwork({ dark = true }: { dark?: boolean }) {
  const palette = dark ? COLORS_DARK : COLORS_LIGHT;
  const ROUTES = PATHS.map((p, i) => ({ ...p, color: palette[i % palette.length] }));
  const lineOpacity = dark ? 0.16 : 0.13;
  const nodeFill = dark ? "#bfdbfe" : "#1e3a8a";
  const nodeStroke = dark ? "#60a5fa" : "#2563eb";
  const nodeHaloOpacity = dark ? 0.55 : 0.4;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <filter id="rn-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {ROUTES.map((r) => (
          <path key={r.id} id={r.id} d={r.d} fill="none" />
        ))}
      </defs>

      {/* base route lines — faint, dashed */}
      {ROUTES.map((r) => (
        <use key={`base-${r.id}`} href={`#${r.id}`} stroke={r.color} strokeOpacity={lineOpacity} strokeWidth={2} strokeDasharray="2 9" strokeLinecap="round" />
      ))}

      {/* travelling light-pulses */}
      {ROUTES.map((r, i) => (
        <g key={`pulse-${r.id}`}>
          <circle r={4.5} fill={r.color} filter="url(#rn-glow)">
            <animateMotion dur={`${r.dur}s`} begin={`${-i * 1.7}s`} repeatCount="indefinite" rotate="auto">
              <mpath href={`#${r.id}`} />
            </animateMotion>
          </circle>
        </g>
      ))}

      {/* nodes with a slow expanding halo */}
      {NODES.map(([cx, cy], i) => (
        <g key={`node-${i}`}>
          <circle cx={cx} cy={cy} r={3.2} fill={nodeFill} fillOpacity={0.9} />
          <circle cx={cx} cy={cy} r={3.2} fill="none" stroke={nodeStroke} strokeWidth={1.4}>
            <animate attributeName="r" values="3.2;18" dur="3.6s" begin={`${-i * 0.5}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values={`${nodeHaloOpacity};0`} dur="3.6s" begin={`${-i * 0.5}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </svg>
  );
}
