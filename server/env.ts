// server/env.ts
import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string(),

  SUPPORT_EMAIL: z.string().email().default("info@lwgpartnersnetwork.com"),
  SUPPORT_PHONE: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => (typeof v === "string" ? v === "true" : !!v)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().optional(),

  // WhatsApp / Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),

  // App URLs / CORS
  APP_URL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),

  // Currency defaults
  DEFAULT_CURRENCY: z.string().default("NLE"),
  USD_RATE: z.coerce.number().default(25),
});

export const env = EnvSchema.parse(process.env);
