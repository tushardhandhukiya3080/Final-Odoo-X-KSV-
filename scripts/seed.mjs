// Demo data: one org, an admin + two employees, vehicles, and a sample ride.
// Idempotent on email/registration. Run after db:migrate.  npm run seed
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
const hash = await bcrypt.hash("password123", 10);

async function upsertUser(email, name, role, orgId, phone) {
  const { rows } = await client.query(
    `INSERT INTO users (email, password_hash, name, phone, organization_id, role)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (lower(email)) DO UPDATE SET organization_id=EXCLUDED.organization_id, role=EXCLUDED.role
     RETURNING id`,
    [email, hash, name, phone, orgId, role],
  );
  return rows[0].id;
}

async function upsertVehicle(userId, model, reg, seats, fuel, mileage) {
  const found = await client.query("SELECT id FROM vehicles WHERE registration_number=$1", [reg]);
  if (found.rows[0]) return found.rows[0].id;
  const { rows } = await client.query(
    `INSERT INTO vehicles (user_id, model, registration_number, seating_capacity, fuel_type, mileage_kmpl)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [userId, model, reg, seats, fuel, mileage],
  );
  return rows[0].id;
}

try {
  await client.connect();

  const orgRes = await client.query(
    `INSERT INTO organizations (name, fuel_price_per_litre, default_fare_per_km, cost_per_km)
     VALUES ('Acme Corp', 106, 8, 6)
     ON CONFLICT (lower(name)) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
    [],
  );
  const org = orgRes.rows[0].id;

  const alice = await upsertUser("alice@acme.com", "Alice Admin", "admin", org, "+919000000001");
  const bob = await upsertUser("bob@acme.com", "Bob Driver", "employee", org, "+919000000002");
  await upsertUser("carol@acme.com", "Carol Rider", "employee", org, "+919000000003");

  // Give everyone some wallet balance to test payments.
  await client.query("UPDATE users SET wallet_balance=1000 WHERE organization_id=$1", [org]);

  const bobCar = await upsertVehicle(bob, "Honda City", "GJ01AB1234", 4, "petrol", 16.5);
  await upsertVehicle(alice, "Tata Nexon EV", "GJ01EV9999", 5, "ev", 25);

  // One published ride by Bob tomorrow morning (Ahmedabad area).
  const exists = await client.query(
    "SELECT id FROM rides WHERE driver_id=$1 AND status='published' LIMIT 1",
    [bob],
  );
  if (!exists.rows[0]) {
    const depart = new Date(Date.now() + 20 * 3600 * 1000).toISOString();
    const geom = JSON.stringify([
      [72.5714, 23.0225],
      [72.5510, 23.0300],
      [72.5200, 23.0400],
    ]);
    await client.query(
      `INSERT INTO rides
        (driver_id, vehicle_id, organization_id, origin_label, origin_lat, origin_lng,
         dest_label, dest_lat, dest_lng, route_geometry, distance_km, duration_min,
         depart_at, seats_total, seats_available, fare_per_seat)
       VALUES ($1,$2,$3,'Maninagar, Ahmedabad',23.0225,72.5714,
               'SG Highway, Ahmedabad',23.0400,72.5200,$4,9.2,22,$5,3,3,45)`,
      [bob, bobCar, org, geom, depart],
    );
  }

  console.log("✅ Seed complete.");
  console.log("   Login: alice@acme.com / bob@acme.com / carol@acme.com  (password123)");
} catch (err) {
  console.error("❌ seed failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
