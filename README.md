# 🚗 RideShare — Enterprise Carpooling Platform

A full-stack, multi-tenant carpooling platform for organizations. Employees
**find** rides or **offer** rides, confirm routes on a live map, book seats,
track trips in real time, chat, and settle fares via wallet/UPI/card/cash.
Built on **Next.js 15 + React 19 + PostgreSQL** with JWT auth, Server-Sent
Events for real-time, OpenStreetMap/OSRM for maps, and Razorpay (test mode).

Built for the Odoo Hackathon "Enterprise Carpooling Platform" problem statement.
See [`progress.md`](./progress.md) for the full roadmap and architecture.

## Quick start

```bash
npm install
npm run up          # Postgres via Docker on localhost:5544
npm run db:migrate  # apply the carpool schema (idempotent)
npm run seed        # demo org + users + a sample ride  (optional)
npm run dev         # http://localhost:3000
```

Open http://localhost:3000 → **Sign up** (first person to name a company becomes
its **admin**; everyone after joins as an **employee**).

**Seeded demo logins** (password `password123`):
`alice@acme.com` (admin) · `bob@acme.com` (has a car + published ride) · `carol@acme.com`

Verify the whole flow at once:

```bash
npm run smoke   # login → search → book → start → track → complete → pay (16 checks)
```

## Feature map (mandatory + bonus)

| Module | Where |
|---|---|
| Authentication + org/role | `src/app/(login\|signup)`, `api/auth/*`, `middleware.ts` |
| Find a Ride + matching | `app/(app)/find`, `api/rides/search` |
| Offer a Ride + route confirm | `app/(app)/offer`, `api/rides`, `api/route` |
| Ride booking | `api/bookings` |
| Trip management + lifecycle | `app/(app)/trips`, `components/trip/*`, `api/rides/[id]/status` |
| Live trip tracking (SSE map) | `components/trip/TripClient`, `api/rides/[id]/ping`, `api/events` |
| Chat + call | `components/trip/ChatPanel`, `api/rides/[id]/messages` |
| Vehicle management | `app/(app)/vehicles`, `api/vehicles/*` |
| Payments + Wallet | `app/(app)/wallet`, `api/payments/*`, `api/wallet/*`, `lib/razorpay.ts` |
| Ride history | `app/(app)/history` |
| Reports & analytics | `app/(app)/reports` |
| Company administration | `app/(app)/admin`, `api/org` |
| Saved places | `app/(app)/places`, `api/places/*` |
| Notifications (bonus) | SSE toasts in `components/AppShell` |
| Ride cancellation (bonus) | `api/bookings/[id]/cancel`, status → cancelled |

## Architecture

- **App shell** — route group `src/app/(app)/` shares one authenticated layout
  (`AppShell`: sidebar, wallet chip, live notifications).
- **API** — every handler wraps `route()` (`src/lib/api.ts`): same-origin guard,
  session auth, org scoping, Zod validation, `{ success, data|error }` envelope.
- **Real-time** — a single in-process SSE bus (`lib/events.ts`) powers live
  location, chat, and notifications. Swap for Redis pub/sub to scale out.
- **Maps** — Leaflet + OSM tiles; routes/ETA from OSRM; geocoding from Nominatim
  (all keyless). `MapView` is loaded client-only via a dynamic wrapper.
- **Money** — wallet debits/credits and trip payments run inside DB transactions
  with row locks (`lib/wallet.ts`, `lib/payments.ts`). Razorpay falls back to a
  signed "mock" order when no keys are set, so payments still demo.

## Configuration

`.env.local` is provided for local dev. For real payments add Razorpay **test**
keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`);
without them the wallet/payment flow uses the mock path. Change `JWT_SECRET`
before deploying. Maps need no keys.

## Notes

- The legacy auth-starter capabilities (semantic search, n8n, WhatsApp) remain
  wired but are not part of the carpool UI.
- Live location sharing uses the browser Geolocation API and is active only
  while a trip is `started`/`in_progress`.
