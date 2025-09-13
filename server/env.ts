// server/env.ts
import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
const toList = (s?: string) =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 5000),
  APP_URL: process.env.APP_URL ?? "http://localhost:5000",

  DATABASE_URL: required("DATABASE_URL"),
  SESSION_SECRET: required("SESSION_SECRET"),

  // CORS
  CORS_ORIGINS: toList(process.env.CORS_ORIGINS ?? "http://localhost:5173"),

  // Email (SMTP)
  SMTP: {
    host: required("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE ?? "false") === "true",
    user: required("SMTP_USER"),
    pass: required("SMTP_PASS"),
    from: required("FROM_EMAIL"),
  },

  // Support / contact
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL ?? "info@lwgpartnersnetwork.com",
  SUPPORT_PHONE: process.env.SUPPORT_PHONE ?? "",

  // Currency defaults
  CURRENCY: {
    default: process.env.DEFAULT_CURRENCY ?? "NLE",
    usdRate: Number(process.env.USD_RATE ?? "22.50"),
  },

  // WhatsApp (Twilio) – optional: enable only if SID & TOKEN set
  TWILIO:
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? {
          sid: process.env.TWILIO_ACCOUNT_SID!,
          token: process.env.TWILIO_AUTH_TOKEN!,
          from: process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886",
          admin: process.env.WHATSAPP_ADMIN ?? "",
        }
      : null,
};
