// server/whatsapp.ts
import { env } from "./env";

export async function sendWhatsApp(toNumber: string, body: string) {
  if (!env.TWILIO) {
    return { ok: false, reason: "twilio-disabled" as const };
  }
  const { sid, token, from } = env.TWILIO;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const params = new URLSearchParams({
    To: toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`,
    From: from,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {}

  return { ok: res.ok, status: res.status, data };
}
