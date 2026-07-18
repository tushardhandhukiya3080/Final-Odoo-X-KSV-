-- Carpooling platform schema. Idempotent — safe to run repeatedly.
-- Applied on top of the existing auth starter (users table already exists).
-- Run:  npm run db:migrate
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Organizations (multi-tenant) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  domain               TEXT,                        -- optional email domain
  currency             TEXT NOT NULL DEFAULT 'INR',
  fuel_price_per_litre NUMERIC(10,2) NOT NULL DEFAULT 100,
  default_fare_per_km  NUMERIC(10,2) NOT NULL DEFAULT 8,
  cost_per_km          NUMERIC(10,2) NOT NULL DEFAULT 6,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_domain_idx
  ON organizations (lower(domain)) WHERE domain IS NOT NULL;
-- One org per name (case-insensitive): lets signup do find-or-create atomically.
CREATE UNIQUE INDEX IF NOT EXISTS organizations_name_lower_idx
  ON organizations (lower(name));

-- ── Users: extend the auth-starter table ─────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role            TEXT NOT NULL DEFAULT 'employee';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone           TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance  NUMERIC(12,2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS users_org_idx ON users (organization_id);

-- ── Vehicles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model               TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  seating_capacity    INT  NOT NULL CHECK (seating_capacity BETWEEN 1 AND 20),
  fuel_type           TEXT NOT NULL DEFAULT 'petrol',   -- petrol|diesel|cng|ev
  mileage_kmpl        NUMERIC(6,2) NOT NULL DEFAULT 15,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicles_user_idx ON vehicles (user_id);
-- Vehicle kind (drives the map marker icon): bike or car.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'car';
-- Set true when the number plate was scanned + read + format-validated.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plate_verified BOOLEAN NOT NULL DEFAULT false;

-- ── Saved places (Home / Office / custom) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_places (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  address    TEXT NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_places_user_idx ON saved_places (user_id);

-- ── Rides (a published/offered ride) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  origin_label    TEXT NOT NULL,
  origin_lat      DOUBLE PRECISION NOT NULL,
  origin_lng      DOUBLE PRECISION NOT NULL,
  dest_label      TEXT NOT NULL,
  dest_lat        DOUBLE PRECISION NOT NULL,
  dest_lng        DOUBLE PRECISION NOT NULL,
  route_geometry  TEXT,                              -- encoded polyline (OSRM)
  distance_km     NUMERIC(8,2) NOT NULL DEFAULT 0,
  duration_min    NUMERIC(8,2) NOT NULL DEFAULT 0,
  depart_at       TIMESTAMPTZ NOT NULL,
  seats_total     INT NOT NULL CHECK (seats_total >= 1),
  seats_available INT NOT NULL CHECK (seats_available >= 0),
  fare_per_seat   NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'published',  -- published|started|in_progress|completed|cancelled
  is_recurring    BOOLEAN NOT NULL DEFAULT false,
  recur_days      TEXT,                               -- e.g. "1,2,3,4,5"
  last_lat        DOUBLE PRECISION,
  last_lng        DOUBLE PRECISION,
  last_ping_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rides_org_status_idx ON rides (organization_id, status);
CREATE INDEX IF NOT EXISTS rides_driver_idx ON rides (driver_id);
CREATE INDEX IF NOT EXISTS rides_depart_idx ON rides (depart_at);

-- Multi-stop routing + live progress (manual stop-by-stop or GPS auto-track).
-- Waypoints in travel order are [origin, ...stops, dest]; progress_index is the
-- index of the last waypoint the driver has reached (0 = still at origin).
ALTER TABLE rides ADD COLUMN IF NOT EXISTS stops          JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS track_mode     TEXT  NOT NULL DEFAULT 'gps';   -- 'manual' | 'gps'
ALTER TABLE rides ADD COLUMN IF NOT EXISTS progress_index INT   NOT NULL DEFAULT 0;

-- ── Bookings (a passenger's seat on a ride) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id        UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seats          INT NOT NULL DEFAULT 1 CHECK (seats >= 1),
  pickup_label   TEXT NOT NULL,
  pickup_lat     DOUBLE PRECISION NOT NULL,
  pickup_lng     DOUBLE PRECISION NOT NULL,
  drop_label     TEXT NOT NULL,
  drop_lat       DOUBLE PRECISION NOT NULL,
  drop_lng       DOUBLE PRECISION NOT NULL,
  fare_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'booked',      -- booked|cancelled|completed
  payment_status TEXT NOT NULL DEFAULT 'pending',     -- pending|completed
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ride_id, passenger_id)
);
CREATE INDEX IF NOT EXISTS bookings_passenger_idx ON bookings (passenger_id);
CREATE INDEX IF NOT EXISTS bookings_ride_idx ON bookings (ride_id);

-- ── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  method             TEXT NOT NULL,                   -- cash|card|upi|wallet
  amount             NUMERIC(10,2) NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending', -- pending|completed|failed
  razorpay_order_id  TEXT,
  razorpay_payment_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_booking_idx ON payments (booking_id);

-- ── Wallet transactions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_txns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,                        -- recharge|payment|credit
  amount        NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reference     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_txns_user_idx ON wallet_txns (user_id, created_at DESC);

-- ── Ride chat messages ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id    UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_ride_idx ON messages (ride_id, created_at);
