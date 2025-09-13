// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is missing. Set it in your environment before running drizzle.",
  );
}

export default defineConfig({
  dialect: "postgresql",

  // 👇 Point this to your actual Drizzle schema file
  // If your schema is somewhere else, change this path.
  schema: "./shared/schema.ts",

  // Where Drizzle writes SQL + meta
  out: "./drizzle",

  dbCredentials: { url },

  verbose: true,
  strict: true,
});
