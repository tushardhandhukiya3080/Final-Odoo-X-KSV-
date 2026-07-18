"use client";

import { useEffect, useState } from "react";

type Pending = {
  email: string;
  name: string | null;
  needsCompany: boolean;
  googlePhone: string | null;
};

export default function OnboardPage() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [ready, setReady] = useState(false);
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "code">("details");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load the pending Google identity; bounce to /login if there isn't one.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/google/pending")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!active) return;
        setPending(d.pending);
        if (d.pending?.googlePhone) setPhone(d.pending.googlePhone);
        setReady(true);
      })
      .catch(() => {
        window.location.href = "/login";
      });
    return () => {
      active = false;
    };
  }, []);

  const body = () => JSON.stringify({ phone, companyName: company || undefined, otp });

  async function sendCode(): Promise<boolean> {
    const res = await fetch("/api/auth/google/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, companyName: company || undefined }),
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
      if (step === "details") {
        if (await sendCode()) setStep("code");
        return;
      }
      const res = await fetch("/api/auth/google/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body(),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Network error. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  if (!ready || !pending) {
    return (
      <div className="auth-wrap">
        <div className="card">
          <p className="subtitle">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <form className="card" onSubmit={onSubmit}>
        <div className="brand-row">
          <span className="brand-badge">🚗</span>
          <strong>RideShare</strong>
        </div>
        <h1>Finish setting up</h1>
        <p className="subtitle">
          Signed in with Google as <strong>{pending.email}</strong>.
        </p>

        {error && <div className="error">{error}</div>}

        {step === "code" ? (
          <>
            <p className="subtitle">
              Enter the 6-digit code we sent on WhatsApp to <strong>{phone}</strong>.
            </p>
            <div className="field">
              <label htmlFor="otp">Verification code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="\d{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
              />
              <span className="hint">
                Didn&apos;t get it?{" "}
                <button type="button" className="linklike" onClick={resend} disabled={loading}>
                  Resend
                </button>{" "}
                ·{" "}
                <button
                  type="button"
                  className="linklike"
                  onClick={() => {
                    setStep("details");
                    setOtp("");
                    setError(null);
                  }}
                  disabled={loading}
                >
                  Edit details
                </button>
              </span>
            </div>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Please wait…" : "Verify & continue"}
            </button>
          </>
        ) : (
          <>
            {pending.needsCompany && (
              <div className="field">
                <label htmlFor="company">Company</label>
                <input
                  id="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  autoComplete="organization"
                  required
                />
                <span className="hint">
                  New company? You&apos;ll become its admin. Existing? You&apos;ll join it.
                </span>
              </div>
            )}
            <div className="field">
              <label htmlFor="phone">WhatsApp number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +919000000001"
                autoComplete="tel"
                required
              />
              <span className="hint">We&apos;ll send a verification code here.</span>
            </div>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Please wait…" : "Send code"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
