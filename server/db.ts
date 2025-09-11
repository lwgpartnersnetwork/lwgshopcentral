// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create the Neon pool (this HAS .query)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ✅ Export a PG-like client that ALWAYS has .query(...)
export const client = {
  query: (text: string, params?: any[]) =>
    pool.query(text as any, params as any),
};

// ✅ Export Drizzle (typed ORM — optional for now)
export const db = drizzle(pool, { schema });
