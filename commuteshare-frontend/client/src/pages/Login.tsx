import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Car, ArrowRight, Users, Building2 } from "lucide-react";
import { api, apiError } from "../lib/api";
import { useAuth } from "../store/auth";
import { Spinner } from "../components/ui";
import RouteNetwork from "../components/RouteNetwork";

type Mode = "login" | "signup" | "register-org";

const DEMO = [
  { label: "Alice (Employee · Acme)", domain: "acme.com", email: "alice@acme.com" },
  { label: "Bob (Employee · Acme)", domain: "acme.com", email: "bob@acme.com" },
  { label: "Admin (Acme)", domain: "acme.com", email: "admin@acme.com" },
  { label: "Gina (Employee · Globex)", domain: "globex.com", email: "gina@globex.com" },
];

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    domain: "acme.com",
    email: "alice@acme.com",
    password: "password",
    name: "",
    orgName: "",
    phone: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { data } = await api.post("/auth/login", { domain: form.domain, email: form.email, password: form.password });
        setSession(data);
      } else if (mode === "signup") {
        const { data } = await api.post("/auth/signup", {
          domain: form.domain, name: form.name, email: form.email, password: form.password, phone: form.phone,
        });
        setSession({ ...data, org: null });
      } else {
        const { data } = await api.post("/auth/register-org", {
          orgName: form.orgName, domain: form.domain, adminName: form.name, adminEmail: form.email, password: form.password,
        });
        setSession(data);
      }
      toast.success("Welcome aboard!");
      navigate("/app");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-full md:grid-cols-2">
      {/* Left brand panel — dark Ocean canvas with the live-commute network */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b1c47] via-[#0a1636] to-[#08111f] p-10 text-white md:flex">
        {/* animated network + soft glow */}
        <RouteNetwork />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_30%_20%,rgba(37,99,235,0.25),transparent_60%)]" />
        <div className="relative z-10 flex items-center gap-2">
          <div className="grid h-11 w-11 place-items-center ring-1 ring-black/10 bg-white text-brand-600 shadow-brutal"><Car className="h-6 w-6" /></div>
          <span className="font-display text-xl font-bold uppercase tracking-tight">CommuteShare</span>
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-5xl font-bold uppercase leading-[1.05] drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">Share the<br />commute.<br />Split the cost.<br />Save the planet.</h1>
          <p className="mt-5 max-w-md rounded-xl bg-white/10 p-3 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-md">
            Enterprise carpooling with intelligent route matching, live tracking, in-trip chat, wallet payments and sustainability analytics — all inside your organization.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { t: "Route-aware", s: "corridor matching" },
              { t: "Real-time", s: "live GPS + chat" },
              { t: "CO₂", s: "impact reports" },
            ].map((x) => (
              <div key={x.t} className="rounded-xl bg-white/10 px-3 py-2 text-white ring-1 ring-white/20 backdrop-blur-md">
                <div className="font-display text-lg font-bold uppercase">{x.t}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-white/60">{x.s}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-[11px] font-bold uppercase tracking-widest text-white/70">Multi-tenant · RBAC · Razorpay · Leaflet/OSM</div>
      </div>

      {/* Right form — light, with a muted network behind */}
      <div className="relative flex items-center justify-center overflow-hidden p-6">
        <RouteNetwork dark={false} />
        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-6 md:hidden flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center ring-1 ring-black/10 bg-brand-500 text-white"><Car className="h-5 w-5" /></div>
            <span className="font-display text-lg font-bold uppercase">CommuteShare</span>
          </div>

          <h2 className="font-display text-3xl font-bold uppercase text-black">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Join your organization" : "Register your company"}
          </h2>
          <p className="mt-1 text-sm font-medium text-black/60">
            {mode === "login" ? "Sign in to your enterprise account." : mode === "signup" ? "Create an employee account with your work email." : "Set up a new organization and admin."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register-org" && (
              <div><label className="label">Company name</label><input className="input" value={form.orgName} onChange={(e) => set("orgName", e.target.value)} placeholder="Acme Corp" required /></div>
            )}
            <div>
              <label className="label">{mode === "register-org" ? "Company domain" : "Organization domain"}</label>
              <input className="input" value={form.domain} onChange={(e) => set("domain", e.target.value)} placeholder="acme.com" required />
            </div>
            {mode !== "login" && (
              <div><label className="label">{mode === "register-org" ? "Admin name" : "Full name"}</label><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" required /></div>
            )}
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@acme.com" required /></div>
            {mode === "signup" && (
              <div><label className="label">Phone (optional)</label><input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 …" /></div>
            )}
            <div><label className="label">Password</label><input type="password" className="input" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" required /></div>

            <button className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner /> : <>{mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Register company"} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {mode !== "login" && <button onClick={() => setMode("login")} className="font-bold uppercase text-brand-600 underline decoration-2 underline-offset-2">Have an account? Sign in</button>}
            {mode === "login" && (
              <>
                <button onClick={() => setMode("signup")} className="flex items-center gap-1 font-bold uppercase text-brand-600 underline decoration-2 underline-offset-2"><Users className="h-4 w-4" />Join an org</button>
                <span className="text-black/30">·</span>
                <button onClick={() => setMode("register-org")} className="flex items-center gap-1 font-bold uppercase text-brand-600 underline decoration-2 underline-offset-2"><Building2 className="h-4 w-4" />Register a company</button>
              </>
            )}
          </div>

          {mode === "login" && (
            <div className="mt-6 ring-1 ring-black/10 bg-pop-yellow p-3 shadow-brutal">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-wider text-black">Demo accounts · password “password”</div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    onClick={() => setForm((f) => ({ ...f, domain: d.domain, email: d.email, password: "password" }))}
                    className="ring-1 ring-black/10 bg-white px-2.5 py-1.5 text-left text-[11px] font-bold text-black transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
