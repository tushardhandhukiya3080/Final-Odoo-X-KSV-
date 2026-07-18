"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Car, ArrowRight, Users, Building2 } from "lucide-react";
import RouteNetwork from "@/components/landing/RouteNetwork";

type Mode = "login" | "signup";

// Only allow same-site relative redirects (block "//evil.com" open redirects).
function safeDest(from: string | null): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/dashboard";
}

function googleError(code: string | null): string | null {
  if (code === "google_disabled") return "Google sign-in isn't configured.";
  if (code === "google_unverified") return "Your Google email isn't verified.";
  if (code === "google") return "Google sign-in failed. Please try again.";
  return null;
}

const DEMO = [
  { label: "Alice · Admin", email: "alice@acme.com" },
  { label: "Bob · Employee", email: "bob@acme.com" },
  { label: "Carol · Employee", email: "carol@acme.com" },
];

export default function AuthForm({
  mode,
  googleEnabled = false,
}: {
  mode: Mode;
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "code">("details");
  const [error, setError] = useState<string | null>(() => googleError(params.get("error")));
  const [loading, setLoading] = useState(false);

  const detailsBody = JSON.stringify({ name, email, password, companyName: company, phone });

  async function sendCode(): Promise<boolean> {
    const res = await fetch("/api/auth/signup/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: detailsBody,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return false;
    }
    return true;
  }

  async function resend() {
    setError(null);
    setLoading(true);
    try {
      await sendCode();
    } catch {
      setError("Network error. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignup && step === "details") {
        if (await sendCode()) setStep("code");
        return;
      }
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: isSignup
          ? JSON.stringify({ name, email, password, companyName: company, phone, otp })
          : JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push(safeDest(params.get("from")));
      router.refresh();
    } catch {
      setError("Network error. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* ── Left brand panel — dark Ocean canvas with the live network ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b1c47] via-[#0a1636] to-[#08111f] p-10 text-white md:flex">
        <div className="ocean-hero opacity-40" />
        <RouteNetwork />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_30%_20%,rgba(37,99,235,0.25),transparent_60%)]" />
        <div className="relative z-10 flex items-center gap-2">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-600 shadow-raised ring-1 ring-black/10"><Car className="h-6 w-6" /></div>
          <span className="font-display text-xl font-bold uppercase tracking-tight">RideShare</span>
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

      {/* ── Right form panel ── */}
      <div className="relative flex items-center justify-center overflow-hidden p-6">
        <RouteNetwork dark={false} />
        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 text-white ring-1 ring-black/10"><Car className="h-5 w-5" /></div>
            <span className="font-display text-lg font-bold uppercase text-slate-800">RideShare</span>
          </div>

          <h2 className="font-display text-3xl font-bold uppercase text-slate-900">
            {isSignup ? (step === "code" ? "Verify your number" : "Join your organization") : "Welcome back"}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isSignup
              ? step === "code"
                ? `Enter the 6-digit code sent on WhatsApp to ${phone}.`
                : "Create your account with your work email."
              : "Sign in to your enterprise account."}
          </p>

          {error && <div className="error mt-4">{error}</div>}

          {googleEnabled && step === "details" && (
            <>
              <a className="btn-google mt-5" href="/api/auth/google/start">
                <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
                </svg>
                Continue with Google
              </a>
              <div className="or-divider"><span>or</span></div>
            </>
          )}

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {isSignup && step === "code" ? (
              <div>
                <label className="label" htmlFor="otp">Verification code</label>
                <input id="otp" className="input tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required autoFocus placeholder="••••••" />
                <div className="mt-2 text-xs font-medium text-slate-500">
                  Didn&apos;t get it?{" "}
                  <button type="button" className="font-bold text-brand-600 underline" onClick={resend} disabled={loading}>Resend</button>{" · "}
                  <button type="button" className="font-bold text-brand-600 underline" onClick={() => { setStep("details"); setOtp(""); setError(null); }} disabled={loading}>Edit details</button>
                </div>
              </div>
            ) : (
              <>
                {isSignup && (
                  <>
                    <div><label className="label" htmlFor="name">Full name</label><input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Jane Doe" required /></div>
                    <div>
                      <label className="label" htmlFor="company">Company</label>
                      <input id="company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Corp" autoComplete="organization" required />
                    </div>
                    <div>
                      <label className="label" htmlFor="phone">WhatsApp number</label>
                      <input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919000000001" autoComplete="tel" required />
                    </div>
                  </>
                )}
                <div><label className="label" htmlFor="email">Work email</label><input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@acme.com" required /></div>
                <div><label className="label" htmlFor="password">Password</label><input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 8 : undefined} placeholder="••••••••" required /></div>
              </>
            )}

            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? "Please wait…" : isSignup ? (step === "code" ? "Verify & create account" : "Send code") : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {isSignup ? (
              <Link href="/login" className="flex items-center gap-1 font-bold uppercase text-brand-600 underline decoration-2 underline-offset-2"><Users className="h-4 w-4" /> Have an account? Sign in</Link>
            ) : (
              <Link href="/signup" className="flex items-center gap-1 font-bold uppercase text-brand-600 underline decoration-2 underline-offset-2"><Building2 className="h-4 w-4" /> Join / register a company</Link>
            )}
          </div>

          {!isSignup && (
            <div className="mt-6 rounded-xl bg-gradient-to-b from-[#fcd775] to-[#efab24] p-3 shadow-raised ring-1 ring-black/10">
              <div className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#5c3702]">Demo accounts · password “password123”</div>
              <div className="grid grid-cols-3 gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => { setEmail(d.email); setPassword("password123"); }}
                    className="rounded-lg bg-white px-2 py-1.5 text-left text-[11px] font-bold text-slate-800 shadow-btn ring-1 ring-black/10 transition-all hover:brightness-105 active:translate-y-px"
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
