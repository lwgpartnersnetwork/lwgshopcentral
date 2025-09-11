// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

// Grab DATABASE_URL from the environment (Render → Environment)
const url = process.env.DATABASE_URL;
if (!url) {
  // Fail fast during build if the DB URL isn't present
  throw new Error(
    "DATABASE_URL is missing. Set it in your hosting env before running drizzle.",
  );
}

export default defineConfig({
  // ⬇️ POINT THIS TO YOUR DRIZZLE TABLES FILE
  // If your tables are in ./shared/schema.ts, switch to that path instead.
  schema: "./server/db.ts",

  // Folder where drizzle will put SQL and meta files
  out: "./migrations",

  // Drizzle-Kit v0.30+ style config for Postgres
  dialect: "postgresql",
  dbCredentials: {
    url, // same as process.env.DATABASE_URL
  },
});
