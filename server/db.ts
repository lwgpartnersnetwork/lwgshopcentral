// server/db.ts
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";
import { env } from "./env";

/**
 * Postgres connection pool
 * - Uses SSL in production (Render/Neon).
 * - Conservative pool sizing; override with PGPOOL_MAX if you need.
 */
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl:
    env.NODE_ENV === "production"
      ? { rejectUnauthorized: false } // Neon/Render
      : undefined,
  max: Number(process.env.PGPOOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
});

/** Drizzle DB instance with schema attached for type safety */
export const db = drizzle(pool, { schema });

/** Re-export all tables/types so other modules can import directly from "../db" */
export * from "../shared/schema";

/** Optional: graceful shutdown so Render doesn’t keep hanging connections */
const shutdown = async () => {
  try {
    await pool.end();
  } catch {
    // ignore
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
