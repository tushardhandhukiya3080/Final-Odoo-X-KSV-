// Real RTO/VAHAN vehicle verification. Two pluggable providers, both env-gated;
// if neither is configured, callers fall back to the local format + duplicate
// check so the app still works with zero setup.
//   1) Cashfree Vehicle-RC  (business KYC)   — CASHFREE_RC_*
//   2) Any RapidAPI RTO API (no KYC, free)   — RAPIDAPI_RTO_*  (recommended for demos)
import { randomUUID } from "crypto";

export interface RcResult {
  configured: boolean; // is a provider key set?
  ok: boolean; // did the RTO confirm a real RC record?
  provider?: "cashfree" | "rapidapi";
  status?: string;
  owner?: string;
  model?: string;
  manufacturer?: string;
  regDate?: string;
  insuranceUpto?: string;
  rcStatus?: string;
  reason?: string;
}

// ── Cashfree ──────────────────────────────────────────────────────────────────
const CF_BASE = process.env.CASHFREE_RC_BASE || "https://sandbox.cashfree.com/verification";
const CF_ID = process.env.CASHFREE_RC_CLIENT_ID;
const CF_SECRET = process.env.CASHFREE_RC_CLIENT_SECRET;

async function viaCashfree(plate: string): Promise<RcResult> {
  try {
    const res = await fetch(`${CF_BASE}/vehicle-rc`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-client-id": CF_ID!, "x-client-secret": CF_SECRET! },
      body: JSON.stringify({ verification_id: randomUUID(), vehicle_number: plate }),
    });
    const d: Record<string, unknown> = await res.json().catch(() => ({}));
    if (!res.ok) return { configured: true, ok: false, provider: "cashfree", reason: (d.message as string) || `RTO lookup failed (${res.status})` };
    const valid = String(d.status ?? "").toUpperCase() === "VALID";
    return {
      configured: true, ok: valid, provider: "cashfree", status: d.status as string,
      owner: d.owner as string, model: d.model as string, manufacturer: d.vehicle_manufacturer_name as string,
      regDate: d.reg_date as string, insuranceUpto: d.vehicle_insurance_upto as string, rcStatus: d.rc_status as string,
      reason: valid ? undefined : "RC not found or not active at the RTO",
    };
  } catch {
    return { configured: true, ok: false, provider: "cashfree", reason: "Could not reach the RTO service" };
  }
}

// ── RapidAPI (generic — works with any RTO API on RapidAPI) ────────────────────
const RA_KEY = process.env.RAPIDAPI_RTO_KEY;
const RA_HOST = process.env.RAPIDAPI_RTO_HOST;
const RA_URL = process.env.RAPIDAPI_RTO_URL; // may contain a {plate} placeholder
const RA_METHOD = (process.env.RAPIDAPI_RTO_METHOD || "GET").toUpperCase();
const RA_PARAM = process.env.RAPIDAPI_RTO_PARAM || "vehicleNumber";
// Full POST body template (JSON) with a {plate} placeholder — for APIs that need
// extra fields, e.g. consent: {"vehicle_no":"{plate}","consent":"Y","consent_text":"…"}
const RA_BODY = process.env.RAPIDAPI_RTO_BODY;

// Case/spacing-insensitive lookup across a record for any of the given keys.
function pick(rec: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!rec || typeof rec !== "object") return undefined;
  const flat: Record<string, unknown> = {};
  for (const k of Object.keys(rec)) flat[k.toLowerCase().replace(/[^a-z0-9]/g, "")] = rec[k];
  for (const key of keys) {
    const v = flat[key.toLowerCase().replace(/[^a-z0-9]/g, "")];
    if (v != null && v !== "") return String(v);
  }
  return undefined;
}

async function viaRapidApi(plate: string): Promise<RcResult> {
  try {
    let url = RA_URL!;
    let body: string | undefined;
    if (RA_METHOD === "POST" && RA_BODY) {
      body = RA_BODY.replace(/\{plate\}/g, plate);
    } else if (url.includes("{plate}")) {
      url = url.replace("{plate}", encodeURIComponent(plate));
    } else if (RA_METHOD === "GET") {
      const u = new URL(url);
      u.searchParams.set(RA_PARAM, plate);
      url = u.toString();
    } else {
      body = JSON.stringify({ [RA_PARAM]: plate });
    }
    const res = await fetch(url, {
      method: RA_METHOD,
      headers: { "X-RapidAPI-Key": RA_KEY!, "X-RapidAPI-Host": RA_HOST!, "Content-Type": "application/json" },
      body,
    });
    const raw: Record<string, unknown> = await res.json().catch(() => ({}));
    if (!res.ok) return { configured: true, ok: false, provider: "rapidapi", reason: (raw.message as string) || `RTO lookup failed (${res.status})` };
    // Providers wrap the record differently — unwrap the common containers.
    const rec = (raw.data || raw.result || raw.response || raw.details || raw) as Record<string, unknown>;
    const owner = pick(rec, ["owner", "owner_name", "ownername", "owner_full_name"]);
    const regNo = pick(rec, ["registration_number", "reg_no", "rc_number", "vehicle_number", "registrationnumber"]);
    const rcStatus = pick(rec, ["rc_status", "status", "registration_status", "rc_status_as_on"]);
    const ok = Boolean(owner || regNo);
    return {
      configured: true, ok, provider: "rapidapi",
      owner,
      model: pick(rec, ["model", "vehicle_model", "model_name", "maker_model"]),
      manufacturer: pick(rec, ["manufacturer", "maker", "vehicle_manufacturer_name", "maker_description", "brand"]),
      regDate: pick(rec, ["registration_date", "reg_date", "registrationdate", "regn_dt"]),
      insuranceUpto: pick(rec, ["insurance_upto", "insurance_validity", "vehicle_insurance_upto", "insurance_expiry"]),
      rcStatus: rcStatus || (ok ? "ACTIVE" : undefined),
      reason: ok ? undefined : "No RC record returned for this plate",
    };
  } catch {
    return { configured: true, ok: false, provider: "rapidapi", reason: "Could not reach the RTO service" };
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
export function rcConfigured(): boolean {
  return Boolean((CF_ID && CF_SECRET) || (RA_KEY && RA_HOST && RA_URL));
}

export async function verifyRc(plate: string): Promise<RcResult> {
  if (CF_ID && CF_SECRET) return viaCashfree(plate);
  if (RA_KEY && RA_HOST && RA_URL) return viaRapidApi(plate);
  return { configured: false, ok: false, reason: "RTO verification is not configured" };
}
