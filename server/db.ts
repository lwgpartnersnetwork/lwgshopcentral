// server/db.ts
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// Import your table definitions
import * as schema from "../shared/schema";

// Create a pooled connection to your database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

// Drizzle DB instance with schema attached (helps with type-safety)
export const db = drizzle(pool, { schema });

// Re-export ALL tables/types so other files can do:
//   import { db, users, vendors, orders, orderItems, products, categories } from "../db";
export * from "../shared/schema";
