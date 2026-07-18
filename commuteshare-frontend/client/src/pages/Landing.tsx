import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import {
  Car, Search, Radio, MessageSquare, Wallet, BarChart3, ShieldCheck, ArrowRight,
  Leaf, Route as RouteIcon, IndianRupee, Users, MapPin, CheckCircle2, Sparkles, Github,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { RIDE_MODES } from "../lib/modes";
import HeroPreview from "../components/HeroPreview";
import RouteNetwork from "../components/RouteNetwork";

// three.js shader is heavy — load it lazily so it never blocks first paint.
const ShaderHero = lazy(() => import("../components/ShaderHero"));

export default function Landing() {
  const token = useAuth((s) => s.accessToken);
  const startHref = token ? "/app" : "/login";

  return (
    <div className="min-h-screen">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative min-h-screen overflow-hidden bg-[#08111f]">
        {/* Layer 1 — animated ShaderGradient (WebGL) with a solid ink fallback */}
        <div className="pointer-events-none absolute inset-0">
          <Suspense fallback={<div className="h-full w-full bg-[#0b1220]" />}>
            <ShaderHero />
          </Suspense>
        </div>
        {/* Layer 2 — animated live-commute network */}
        <RouteNetwork />
        {/* Legibility scrims — darker on the left (text) and along top/bottom */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#08111f]/85 via-[#08111f]/35 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#08111f]/40 via-transparent to-[#08111f]/60" />

        {/* Nav */}
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center ring-1 ring-black/10 bg-white text-brand-600 shadow-brutal"><Car className="h-5 w-5" /></div>
            <span className="font-display text-xl font-bold uppercase tracking-tight text-white">CommuteShare</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm font-bold uppercase tracking-wide text-white/90 hover:text-white">Features</a>
            <a href="#how" className="text-sm font-bold uppercase tracking-wide text-white/90 hover:text-white">How it works</a>
            <a href="#impact" className="text-sm font-bold uppercase tracking-wide text-white/90 hover:text-white">Impact</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="ring-1 ring-black/10 bg-white px-4 py-2 text-sm font-extrabold uppercase text-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5">Log in</Link>
            <Link to={startHref} className="hidden ring-1 ring-black/10 bg-pop-yellow px-4 py-2 text-sm font-extrabold uppercase text-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 sm:inline-block">Get started</Link>
          </div>
        </nav>

        {/* Hero content — two columns: pitch on the left, live product card on the right */}
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-12 md:pt-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-pop-yellow px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-black shadow-lg ring-1 ring-black/10">
              <Sparkles className="h-3.5 w-3.5" /> National-Level Hackathon
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold uppercase leading-[1.02] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] sm:text-6xl">
              Share the commute.<br />
              <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">Split the cost.</span><br />
              Save the planet.
            </h1>
            <p className="mt-6 max-w-lg border-l-2 border-brand-400 pl-4 text-lg font-medium text-white/85">
              A multi-tenant carpooling platform for organizations — intelligent route matching, live GPS tracking, in-trip chat, wallet payments and CO₂ analytics, all inside your company.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={startHref} className="btn bg-brand-500 text-white">Get started <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/login" className="btn bg-white text-slate-800">Live demo</Link>
            </div>
            {/* ride-mode strip */}
            <div className="mt-8">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-white/60">Book any ride</div>
              <div className="flex flex-wrap gap-2">
                {RIDE_MODES.map((m) => (
                  <div key={m.value} className={`flex items-center gap-2 rounded-xl ${m.tint} px-3.5 py-2 shadow-md ring-1 ring-black/10`}>
                    <span className="text-lg">{m.emoji}</span>
                    <span className="font-display text-sm font-bold uppercase text-black">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live product preview */}
          <div className="hidden justify-self-center lg:block">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* ═══════════════ TECH STRIP ═══════════════ */}
      <div className="border-y-[3px] border-black bg-black py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 text-xs font-extrabold uppercase tracking-widest text-white/80">
          {["React", "TypeScript", "Node + Express", "PostgreSQL", "Prisma", "Socket.IO", "Razorpay", "Leaflet / OSM"].map((t) => (
            <span key={t} className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-pop-yellow" />{t}</span>
          ))}
        </div>
      </div>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <SectionHeading kicker="What's inside" title="Everything a real ride-share needs" />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {/* featured, wide tile */}
          <Feature className="lg:col-span-4" featured grad="from-brand-500 to-brand-700" icon={<Search className="h-6 w-6" />} title="Intelligent matching" body="Ranks rides by route-corridor overlap, time window and seat availability — not exact address strings. The one feature that separates this from a lookup." />
          <Feature className="lg:col-span-2" grad="from-indigo-400 to-indigo-600" icon={<Radio className="h-6 w-6" />} title="Live GPS tracking" body="Real Socket.IO stream — a moving marker + live ETA, active only during the trip." />
          <Feature className="lg:col-span-2" grad="from-teal-400 to-teal-600" icon={<MessageSquare className="h-6 w-6" />} title="In-trip chat" body="Instant per-trip messaging plus a one-tap call between rider and driver." />
          <Feature className="lg:col-span-2" grad="from-amber-400 to-amber-600" icon={<Wallet className="h-6 w-6" />} title="Payments & wallet" body="Razorpay test-mode with server-verified signatures + a wallet ledger." />
          <Feature className="lg:col-span-2" grad="from-sky-400 to-sky-600" icon={<BarChart3 className="h-6 w-6" />} title="Impact analytics" body="Distance, fuel cost, cost/km, vehicle breakdown & CO₂ — from real data." />
          <Feature className="lg:col-span-6" grad="from-slate-500 to-slate-700" icon={<ShieldCheck className="h-6 w-6" />} title="Multi-tenant RBAC" body="True org isolation with org-scoped JWTs. Admins configure; employees ride. No cross-org data leakage — provable live across two seeded organizations." />
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how" className="border-t border-black/10 bg-white/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHeading kicker="The happy path" title="From find to paid in four steps" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Step n="01" icon={<RouteIcon className="h-5 w-5" />} title="Offer or find" body="Publish your commute, or search a corridor and get ranked matches." />
            <Step n="02" icon={<CheckCircle2 className="h-5 w-5" />} title="Book a seat" body="Atomic seat booking — no overbooking, even under concurrent requests." />
            <Step n="03" icon={<MapPin className="h-5 w-5" />} title="Track live" body="Watch the driver move on the map in real time with a live ETA + chat." />
            <Step n="04" icon={<IndianRupee className="h-5 w-5" />} title="Pay & report" body="Pay by wallet or Razorpay; the trip and its CO₂ savings roll into reports." />
          </div>
        </div>
      </section>

      {/* ═══════════════ IMPACT ═══════════════ */}
      <section id="impact" className="mx-auto max-w-6xl px-5 py-20">
        <SectionHeading kicker="Why it matters" title="Every shared seat counts" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Impact icon={<Leaf className="h-6 w-6" />} value="−2.3 kg" label="CO₂ per litre avoided" />
          <Impact icon={<Users className="h-6 w-6" />} value="4 seats" label="one car, four commuters" />
          <Impact icon={<IndianRupee className="h-6 w-6" />} value="~50%" label="fare split saving" />
          <Impact icon={<RouteIcon className="h-6 w-6" />} value="Live" label="ETA & tracking" />
        </div>
      </section>

      {/* ═══════════════ CTA BAND ═══════════════ */}
      <section className="relative overflow-hidden border-y-[3px] border-black bg-[#08111f]">
        {/* Layer 1 — Ocean shader */}
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <Suspense fallback={<div className="h-full w-full bg-[#0b1220]" />}>
            <ShaderHero />
          </Suspense>
        </div>
        {/* Layer 2 — animated live-commute network */}
        <RouteNetwork />
        <div className="pointer-events-none absolute inset-0 bg-[#08111f]/30" />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-5 py-20 text-center">
          <h2 className="font-display text-4xl font-bold uppercase text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.5)] sm:text-5xl">Ready to ride together?</h2>
          <p className="mt-3 max-w-lg text-lg font-semibold text-white/90">Spin up the demo — two orgs, live tracking, payments and reports are seeded and ready.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={startHref} className="btn bg-pop-yellow text-black">Launch the app <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/login" className="btn bg-white text-black">Log in</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center ring-1 ring-black/10 bg-brand-500 text-white"><Car className="h-4 w-4" /></div>
            <span className="font-display font-bold uppercase">CommuteShare</span>
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-black/50">Multi-tenant · RBAC · Razorpay · Leaflet/OSM · Built for a national-level hackathon</div>
          <a href="#" className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-black/60 hover:text-black"><Github className="h-4 w-4" /> Source</a>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <span className="inline-block ring-1 ring-black/10 bg-pop-yellow px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest shadow-brutal-sm">{kicker}</span>
      <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold uppercase leading-tight sm:text-4xl">{title}</h2>
    </div>
  );
}

function Feature({ grad, icon, title, body, className = "", featured = false }: { grad: string; icon: React.ReactNode; title: string; body: string; className?: string; featured?: boolean }) {
  return (
    <div className={`bento bento-hover flex flex-col ${featured ? "justify-between" : ""} ${className}`}>
      <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-b ${grad} text-white shadow-md ring-1 ring-black/10`}>{icon}</div>
      <div>
        <div className={`mt-4 font-display font-bold uppercase ${featured ? "text-2xl" : "text-lg"}`}>{title}</div>
        <p className={`mt-1.5 font-medium text-slate-500 ${featured ? "text-base max-w-md" : "text-sm"}`}>{body}</p>
      </div>
    </div>
  );
}

function Step({ n, icon, title, body }: { n: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bento bento-hover">
      <div className="flex items-center justify-between">
        <span className="font-display text-4xl font-bold text-black/15">{n}</span>
        <div className="grid h-10 w-10 place-items-center ring-1 ring-black/10 bg-white shadow-brutal-sm">{icon}</div>
      </div>
      <div className="mt-3 font-display text-base font-bold uppercase">{title}</div>
      <p className="mt-1 text-sm font-semibold text-black/60">{body}</p>
    </div>
  );
}

function Impact({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bento-brand text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center ring-1 ring-black/10 bg-white text-brand-600">{icon}</div>
      <div className="mt-3 font-display text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-brand-100">{label}</div>
    </div>
  );
}
