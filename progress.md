# RideShare — Enterprise Carpooling Platform · Build Roadmap

> Industrial-grade implementation of the Odoo Hackathon "Enterprise Carpooling Platform".
> Employees of registered organizations discover, offer, book, track, and pay for shared rides.

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · 🔒 blocked

---

## 0. Product summary

A multi-tenant (multi-organization) web platform where an authenticated employee can act as **driver** (Offer a Ride) or **passenger** (Find a Ride) — same account, two activities. A **Company Administrator** configures the organization (fuel/travel cost, employees, vehicles) but does not run day-to-day rides.

End-to-end flow: **Launch → Auth → Find/Offer → Route confirmation → Book/Publish → My Trips → Live tracking + chat → Complete → Pay → Ride History → Reports.**

---

## 1. Tech decisions (locked)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19** | Already scaffolded here; SSR + API routes in one app |
| Language | **TypeScript (strict)** | Type-safe domain across API + UI |
| DB | **PostgreSQL 16** (Docker, `pg` pool) | Already wired; relational fits rides/bookings/wallet |
| Auth | **JWT (jose) in httpOnly cookie + bcrypt** | Already hardened (CSRF, rate-limit, timing-safe) |
| Real-time | **Server-Sent Events** (existing `events.ts` bus) | Live tracking + chat + notifications, zero new deps |
| Maps | **Leaflet + OpenStreetMap tiles** (`react-leaflet`) | Free, no API key — hackathon-friendly |
| Routing/ETA | **OSRM public API** (`router.project-osrm.org`) | Free route geometry + distance + duration |
| Geocoding | **Nominatim (OSM)** server-side w/ UA header | Free address ↔ lat/lng |
| Payments | **Razorpay Test Mode** (Orders + Checkout) | Per spec; sandbox, no real money |
| Styling | **CSS variables + CSS Modules** (native to Next) | Consistent with existing design tokens, no new dep |

**New dependencies:** `leaflet`, `react-leaflet`, `razorpay`, `@types/leaflet`.
Reused as-is: `pg`, `jose`, `bcryptjs`, `zod`, `pino`. Legacy starter features (semantic search / n8n / WhatsApp) are left intact but not surfaced in the carpool UI.

---

## 2. Data model

```
organizations   id, name, domain, currency, fuel_price_per_litre,
                default_fare_per_km, cost_per_km, created_at
users (extend)  + organization_id, role('employee'|'admin'), phone,
                wallet_balance
vehicles        id, user_id, model, registration_number, seating_capacity,
                fuel_type, mileage_kmpl, is_active, created_at
saved_places    id, user_id, label, address, lat, lng
rides           id, driver_id, vehicle_id, organization_id,
                origin_*, dest_*, route_geometry, distance_km, duration_min,
                depart_at, seats_total, seats_available, fare_per_seat,
                status('published'|'started'|'in_progress'|'completed'|'cancelled'),
                is_recurring, recur_days, last_lat, last_lng, last_ping_at
bookings        id, ride_id, passenger_id, seats, pickup_*, drop_*,
                fare_amount, status('booked'|'cancelled'|'completed'),
                payment_status('pending'|'completed'), created_at
payments        id, booking_id, method('cash'|'card'|'upi'|'wallet'),
                amount, status, razorpay_order_id, razorpay_payment_id
wallet_txns     id, user_id, type('recharge'|'payment'|'credit'),
                amount, balance_after, reference, created_at
messages        id, ride_id, sender_id, body, created_at
```

Ride matching = same org + `published` + seats available + depart within date window + origin & destination within radius (haversine) of search points.

---

## 3. API surface (target)

```
Auth        POST /api/auth/signup|login|logout   GET /api/auth/me
Org/Admin   GET/PATCH /api/org                    (admin config)
            GET /api/admin/employees              GET /api/admin/vehicles
            GET /api/admin/stats
Vehicles    GET/POST /api/vehicles   PATCH/DELETE /api/vehicles/:id
Places      GET/POST /api/places     DELETE /api/places/:id
Route       POST /api/route          (OSRM: geometry, distance, duration)
Geocode     GET  /api/geocode?q=     (Nominatim)
Rides       POST /api/rides          (offer/publish)
            GET  /api/rides/search   (find/match)
            GET  /api/rides/:id
            POST /api/rides/:id/status   (start/progress/complete)
            POST /api/rides/:id/ping     (driver location → SSE)
Bookings    POST /api/bookings        GET /api/bookings (my trips)
            POST /api/bookings/:id/cancel
Payments    POST /api/payments/order  POST /api/payments/verify
            POST /api/payments/cash
Wallet      GET /api/wallet   POST /api/wallet/recharge
Chat        GET/POST /api/rides/:id/messages
History     GET /api/history
Reports     GET /api/reports
Realtime    GET /api/events  (SSE; existing)
```

Every mutating route: same-origin guard + Zod validation + session auth + org scoping. Standard envelope `{ success, data?, error? }`.

---

## 4. Screens (target)

Splash · Login · Sign Up · Dashboard · Find Ride · Route Confirmation · Available Rides · Offer Ride · My Vehicle · My Trips · Trip Detail (live map + chat) · Payment · Wallet · Ride History · Reports · Saved Places · Settings · Admin Console.

---

## Status — Phases 0–7 built & smoke-verified ✅

Production build passes (`npm run build`), schema migrates, and the full golden
path (login → search → book → start → live-ping → complete → wallet pay → chat)
passes 16/16 automated checks (`npm run smoke`). Remaining work is Phase 8 polish
and bonus items.

## Phases & tasks

### Phase 0 — Foundation ✅
- [x] Analyze existing starter, lock stack, write this roadmap
- [x] DB schema: `db/carpool.sql` (idempotent) + Docker init mount + `scripts/migrate.mjs`
- [x] Deps + env: `leaflet`, `react-leaflet`, `razorpay`; Razorpay + map config in `.env`
- [x] Core libs: `types.ts`, org/role `session.ts`/`auth.ts`, `api.ts` (guard+envelope), `geo.ts`, `wallet.ts`, `payments.ts`, `razorpay.ts`, `checkout.ts`, `client.ts`, `validation.ts`
- [x] Middleware: protect app routes; role gate for `/admin`

### Phase 1 — Identity & shell ✅
- [x] Org-aware **signup** (create/join org, first user = admin), **login**, `/me` returns role+org+wallet
- [x] Dashboard: header, Find/Offer CTAs, stat tiles, next trip, live notifications feed
- [x] `AppShell` (sidebar nav + wallet chip + SSE toasts) + Settings hub screen

### Phase 2 — Vehicles & Saved Places ✅
- [x] Vehicles CRUD (model, reg no., seats, fuel type, mileage) — required before offering
- [x] Saved Places CRUD (Home/Office/custom) with geocode autocomplete

### Phase 3 — Ride discovery & publishing ✅
- [x] `geo.ts` route calc + `/api/route`, `/api/geocode`
- [x] Offer Ride: vehicle, origin/dest, date/time, seats, fare → route confirmation → publish
- [x] Find Ride: origin/dest/date/seats → route confirmation → matched results
- [x] Ride matching engine (org + 48h window + haversine radius + seats)

### Phase 4 — Booking, trips, tracking, chat ✅
- [x] Book ride (atomic seat decrement under row lock, fare calc)
- [x] My Trips (driver rides + passenger bookings) with lifecycle
- [x] Trip Detail: details, status transitions, **live map** (driver ping → SSE → passenger)
- [x] Driver GPS ping loop (throttled), tracking active only while trip live
- [x] Ride chat (SSE) + call link (`tel:`)
- [x] Ride cancellation (bonus) + SSE notifications

### Phase 5 — Payments & wallet ✅
- [x] Wallet: balance, recharge (Razorpay order → verify → credit), txn history
- [x] Pay completed trip: Cash / Card / UPI / Wallet; wallet moves money driver↔passenger
- [x] Razorpay order create + signature verify (server), Checkout (client), keyless mock fallback

### Phase 6 — History & reports ✅
- [x] Ride History (completed trips, participants, route, vehicle, date, status)
- [x] Reports: trips, distance, fuel consumption, cost/km, vehicle-wise cost, monthly trend (CSS charts)

### Phase 7 — Company Admin ✅
- [x] Admin console: org config (fuel price, cost/km, default fare), employees, participation stats
- [x] Role-gated access (middleware + layout)

### Phase 8 — Hardening & polish (in progress)
- [x] Seed script (demo org, admin, employees, vehicles, sample ride)
- [x] Smoke/E2E script covering the golden path (`npm run smoke`)
- [x] Empty/loading/error states, mobile-responsive shell, README refresh
- [ ] Deeper a11y pass, unit tests per module, security re-review, real Razorpay sandbox run

### Bonus (stretch)
- [x] Real-time notifications (SSE toasts), ride cancellation
- [ ] Intelligent matching (detour-aware), route optimization, enhanced analytics, recurring-ride materialization, push notifications

---

## Acceptance (demo golden path)
1. Admin signs up → creates org → sets fuel price + cost/km.
2. Employee A registers a vehicle → offers a ride (route confirmed, published).
3. Employee B searches → sees A's ride → books a seat.
4. Ride shows in both users' **My Trips**.
5. A starts trip → pings location → B watches live map + ETA; they chat.
6. A completes trip → B pays via wallet/UPI → booking marked paid.
7. Trip lands in **Ride History**; **Reports** reflect trips/distance/fuel/cost.

---

## Run
```bash
npm install
npm run up          # Postgres (+ n8n) via Docker  → localhost:5544
npm run db:migrate  # apply carpool schema
npm run dev         # http://localhost:3000
npm run seed        # optional demo data
```

## Change log
- **2026-07-18** — Roadmap authored; full platform built on the existing auth
  starter. Schema, org/role auth, maps, all 12 modules, and payments implemented.
  Build green, DB migrated + seeded, golden-path smoke test 16/16. Phases 0–7 done.
