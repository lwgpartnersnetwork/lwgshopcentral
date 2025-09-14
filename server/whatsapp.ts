// server/whatsapp.ts
import { env } from "./env";

/**
 * Sends a WhatsApp message via Twilio if credentials are configured.
 * No-ops (resolves) if not configured.
 */
export async function sendWhatsApp(toRaw: string, body: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return;
  }

  // Lazy import twilio so app still runs if it's not installed yet
  const twilio = (await import("twilio")).default;
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  // Ensure whatsapp: prefix
  const to = toRaw.startsWith("whatsapp:") ? toRaw : `whatsapp:${toRaw}`;

  await client.messages.create({
    from: TWILIO_WHATSAPP_FROM, // e.g. 'whatsapp:+14155238886'
    to,
    body,
  });
}
