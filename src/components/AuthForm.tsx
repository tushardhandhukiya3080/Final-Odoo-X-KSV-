"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "signup";

// Only allow same-site relative redirects (block "//evil.com" open redirects).
function safeDest(from: string | null): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/dashboard";
}

// Map ?error codes from the Google callback to a readable message.
function googleError(code: string | null): string | null {
  if (code === "google_disabled") return "Google sign-in isn't configured.";
  if (code === "google_unverified") return "Your Google email isn't verified.";
  if (code === "google") return "Google sign-in failed. Please try again.";
  return null;
}

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
  // Signup is two-step: "details" collects the form, "code" verifies the
  // WhatsApp OTP. Login stays single-step.
  const [step, setStep] = useState<"details" | "code">("details");
  const [error, setError] = useState<string | null>(() => googleError(params.get("error")));
  const [loading, setLoading] = useState(false);

  const detailsBody = JSON.stringify({
    name,
    email,
    password,
    companyName: company,
    phone,
  });

  // Ask the server to WhatsApp a code. Returns true on success.
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
      // Signup step 1 → send the code, then switch to the verify step.
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
    <div className="auth-wrap">
      <form className="card" onSubmit={onSubmit}>
        <div className="brand-row">
          <span className="brand-badge">🚗</span>
          <strong>RideShare</strong>
        </div>
        <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="subtitle">
          {isSignup
            ? "Join your company's carpool network."
            : "Log in to find or offer a ride."}
        </p>

        {error && <div className="error">{error}</div>}

        {googleEnabled && step === "details" && (
          <>
            <a className="btn-google" href="/api/auth/google/start">
              <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
                />
              </svg>
              Continue with Google
            </a>
            <div className="or-divider">
              <span>or</span>
            </div>
          </>
        )}

        {isSignup && step === "code" ? (
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
              {loading ? "Please wait…" : "Verify & create account"}
            </button>
          </>
        ) : (
          <>
            {isSignup && (
              <>
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
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
              </>
            )}

            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 8 : undefined}
                required
              />
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Please wait…" : isSignup ? "Send code" : "Log in"}
            </button>
          </>
        )}

        <p className="switch">
          {isSignup ? (
            <>
              Already have an account? <Link href="/login">Log in</Link>
            </>
          ) : (
            <>
              No account? <Link href="/signup">Sign up</Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
