import { Pool, type QueryResultRow } from "pg";

// Reuse one pool across hot reloads in dev (Next re-imports modules on change).
const globalForPg = globalThis as unknown as { pgPool?: Pool };

function createPool(): Pool {
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
  // Idle pooled clients can error out (DB restart, network blip) and pg
  // re-emits those on the Pool. Without a listener Node treats it as an
  // uncaught exception and crashes the whole process — so always attach one.
  p.on("error", (err) => {
    console.error("Unexpected idle Postgres client error:", err);
  });
  return p;
}

export const pool = globalForPg.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return pool.query<T>(text, params as unknown[]);
}
