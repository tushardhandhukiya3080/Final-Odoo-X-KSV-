// Apply db/carpool.sql to the running Postgres. Idempotent.
// Usage: npm run db:migrate   (reads DATABASE_URL from .env.local)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal .env.local loader (no dotenv dep).
try {
  const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* no .env.local — rely on real env */
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set (check .env.local).");
  process.exit(1);
}

const sql = readFileSync(join(__dirname, "..", "db", "carpool.sql"), "utf8");
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  await client.query(sql);
  console.log("✅ carpool schema applied.");
} catch (err) {
  console.error("❌ migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
