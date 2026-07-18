import { z } from "zod";

// ── Auth ─────────────────────────────────────────────────────────────────────
export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  // Required now: a WhatsApp code is sent here to verify the number at signup.
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{8,20}$/, "Enter a valid WhatsApp number"),
  companyName: z.string().trim().min(1, "Company name is required").max(120),
});

// Final signup step: same fields plus the 6-digit code from WhatsApp.
export const signupVerifySchema = signupSchema.extend({
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

// Google onboarding: after Google sign-in the user supplies a WhatsApp number
// (and a company if they're new) — companyName is required conditionally in the
// route, based on whether the pending identity already has an organization.
export const onboardOtpSchema = z.object({
  phone: z.string().trim().regex(/^\+?[\d\s-]{8,20}$/, "Enter a valid WhatsApp number"),
  companyName: z.string().trim().min(1).max(120).optional(),
});
export const onboardCompleteSchema = onboardOtpSchema.extend({
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  // WhatsApp number in E.164 (e.g. +919000000001) — used for payment invoices.
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

// ── Geo primitives ───────────────────────────────────────────────────────────
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const point = z.object({ lat, lng });

export const routeSchema = z.object({ from: point, to: point, via: z.array(point).max(10).default([]) });
export const geocodeSchema = z.object({ q: z.string().trim().min(2).max(200) });

// ── Vehicles ─────────────────────────────────────────────────────────────────
export const vehicleSchema = z.object({
  model: z.string().trim().min(1, "Model is required").max(100),
  registrationNumber: z.string().trim().min(1, "Registration number is required").max(30),
  vehicleType: z.enum(["bike", "car"]).default("car"),
  seatingCapacity: z.coerce.number().int().min(1).max(20),
  fuelType: z.enum(["petrol", "diesel", "cng", "ev"]).default("petrol"),
  mileageKmpl: z.coerce.number().min(1).max(100).default(15),
  // true when the plate was scanned + OCR-read + format-validated on the client.
  plateVerified: z.boolean().default(false),
});

// ── Saved places ─────────────────────────────────────────────────────────────
export const placeSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(60),
  address: z.string().trim().min(1, "Address is required").max(300),
  lat,
  lng,
});

// ── Offer a ride ─────────────────────────────────────────────────────────────
const placePoint = point.extend({ label: z.string().trim().min(1).max(300) });

export const offerRideSchema = z.object({
  vehicleId: z.string().uuid("Select a vehicle"),
  origin: placePoint,
  dest: placePoint,
  // Intermediate stops along the route (manual mode). Empty for a direct trip.
  stops: z.array(placePoint).max(10).default([]),
  // How the ride's live position is tracked: driver taps each stop, or GPS.
  trackMode: z.enum(["manual", "gps"]).default("gps"),
  departAt: z.coerce.date(),
  seats: z.coerce.number().int().min(1).max(20),
  farePerSeat: z.coerce.number().min(0).max(100000),
  isRecurring: z.boolean().default(false),
  recurDays: z.string().trim().max(20).optional(),
});

// Driver advances to the next stop (manual mode).
export const progressSchema = z.object({ action: z.enum(["advance", "reset"]).default("advance") });

// ── Find a ride ──────────────────────────────────────────────────────────────
export const searchRideSchema = z.object({
  origin: point.extend({ label: z.string().trim().min(1).max(300) }),
  dest: point.extend({ label: z.string().trim().min(1).max(300) }),
  departDate: z.coerce.date(),
  seats: z.coerce.number().int().min(1).max(20).default(1),
});

// ── Booking ──────────────────────────────────────────────────────────────────
export const bookingSchema = z.object({
  rideId: z.string().uuid(),
  seats: z.coerce.number().int().min(1).max(20).default(1),
  pickup: point.extend({ label: z.string().trim().min(1).max(300) }).optional(),
  drop: point.extend({ label: z.string().trim().min(1).max(300) }).optional(),
});

// ── Trip lifecycle ───────────────────────────────────────────────────────────
export const rideStatusSchema = z.object({
  status: z.enum(["started", "in_progress", "completed", "cancelled"]),
});
export const pingSchema = z.object({ lat, lng });

// ── Chat ─────────────────────────────────────────────────────────────────────
export const messageSchema = z.object({ body: z.string().trim().min(1).max(1000) });

// ── Wallet & payments ────────────────────────────────────────────────────────
export const rechargeSchema = z.object({ amount: z.coerce.number().min(1).max(100000) });
export const walletConfirmSchema = z.object({
  amount: z.coerce.number().min(1).max(100000),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
export const paymentOrderSchema = z.object({ bookingId: z.string().uuid() });
export const paymentVerifySchema = z.object({
  bookingId: z.string().uuid(),
  method: z.enum(["card", "upi"]),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
export const paymentDirectSchema = z.object({
  bookingId: z.string().uuid(),
  method: z.enum(["cash", "wallet"]),
});

// ── Admin org config ─────────────────────────────────────────────────────────
export const orgUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  fuelPricePerLitre: z.coerce.number().min(0).max(100000).optional(),
  defaultFarePerKm: z.coerce.number().min(0).max(100000).optional(),
  costPerKm: z.coerce.number().min(0).max(100000).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OfferRideInput = z.infer<typeof offerRideSchema>;
export type SearchRideInput = z.infer<typeof searchRideSchema>;
