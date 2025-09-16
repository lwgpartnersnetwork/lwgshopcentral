// server/env.ts
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Server
  PORT: z.coerce.number().default(5000),
  SESSION_SECRET: z.string().min(10, "SESSION_SECRET is required and should be long"),

  // Database (required)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // SMTP email (optional — if missing, emails are skipped)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(), // true for 465, false for 587

  // Optional display/support addresses
  FROM_EMAIL: z.string().optional(),
  SUPPORT_EMAIL: z.string().optional(),
});

export const env = schema.parse(process.env);
