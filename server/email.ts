// server/email.ts
import { env } from "./env";

/** Build a nodemailer transport on demand. Returns null if not configured. */
async function getTransport() {
  const hasSMTP =
    !!env.SMTP_HOST && !!env.SMTP_USER && !!env.SMTP_PASS && !!env.SMTP_PORT;
  if (!hasSMTP) return null;

  // Lazy import so the app still runs if nodemailer isn't installed yet
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport({
    host: env.SMTP_HOST!,
    port: Number(env.SMTP_PORT!),
    secure: !!env.SMTP_SECURE, // true for 465, false for 587
    auth: {
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
    },
  });
}

type OrderEmailBase = {
  to: string;
  orderId: string;
  vendor: { id: string; storeName: string };
  customer: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
  };
  currency: string; // "NLE" | "USD"
  rate: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: string;
  shippingAddress: Record<string, any>;
  notes?: string | null;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number; // NLe amount per item
    imageUrl?: string | null;
  }>;
};

function renderItemsTable(items: OrderEmailBase["items"], currency: string) {
  const rows = items
    .map(
      (i) => `
        <tr>
          <td style="padding:8px;border:1px solid #eee">${i.name}</td>
          <td style="padding:8px;border:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px;border:1px solid #eee;text-align:right">${currency} ${i.price.toFixed(2)}</td>
          <td style="padding:8px;border:1px solid #eee;text-align:right">${currency} ${(i.price * i.quantity).toFixed(2)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <table style="border-collapse:collapse;width:100%;margin:12px 0">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #eee;text-align:left">Item</th>
          <th style="padding:8px;border:1px solid #eee">Qty</th>
          <th style="padding:8px;border:1px solid #eee">Price</th>
          <th style="padding:8px;border:1px solid #eee">Line Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderOrderSummary(p: OrderEmailBase) {
  const addr =
    p.shippingAddress &&
    Object.entries(p.shippingAddress)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join("<br/>");

  return `
    <div style="font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
      <p><strong>Order ID:</strong> ${p.orderId}</p>
      <p><strong>Vendor:</strong> ${p.vendor.storeName}</p>
      <p><strong>Customer:</strong> ${p.customer.customerName} (${p.customer.customerEmail}${
        p.customer.customerPhone ? `, ${p.customer.customerPhone}` : ""
      })</p>
      <p><strong>Payment:</strong> ${p.paymentMethod}</p>
      <p><strong>Currency:</strong> ${p.currency}${
        p.currency === "USD" ? ` (rate ${p.rate} NLe/USD)` : ""
      }</p>

      ${renderItemsTable(p.items, p.currency)}

      <table style="margin-left:auto">
        <tr><td style="padding:4px 8px">Subtotal:</td><td style="padding:4px 8px;text-align:right"><strong>${p.currency} ${p.subtotal.toFixed(
          2,
        )}</strong></td></tr>
        <tr><td style="padding:4px 8px">Shipping:</td><td style="padding:4px 8px;text-align:right"><strong>${p.currency} ${p.shippingFee.toFixed(
          2,
        )}</strong></td></tr>
        <tr><td style="padding:4px 8px">Total:</td><td style="padding:4px 8px;text-align:right"><strong>${p.currency} ${p.total.toFixed(
          2,
        )}</strong></td></tr>
      </table>

      ${addr ? `<p><strong>Shipping Address</strong><br/>${addr}</p>` : ""}
      ${p.notes ? `<p><strong>Notes:</strong> ${p.notes}</p>` : ""}
    </div>
  `;
}

/** Send to admin (operations) */
export async function sendAdminNewOrderEmail(p: OrderEmailBase) {
  const transport = await getTransport();
  if (!transport) {
    // no SMTP configured — just skip silently
    return;
  }

  const from = env.FROM_EMAIL || `LWG MarketPlace <${env.SMTP_USER}>`;
  const subject = `🧾 New Order ${p.orderId.slice(0, 8)} — ${p.vendor.storeName}`;
  const html =
    `<h2>New order received</h2>` +
    renderOrderSummary(p) +
    `<p style="color:#666;font-size:12px;margin-top:12px">This is an automated message from LWG MarketPlace.</p>`;

  await transport.sendMail({
    from,
    to: p.to,
    subject,
    html,
  });
}

/** Send to buyer (receipt) */
export async function sendBuyerReceiptEmail(p: OrderEmailBase) {
  const transport = await getTransport();
  if (!transport) {
    // no SMTP configured — just skip silently
    return;
  }

  const from = env.FROM_EMAIL || `LWG MarketPlace <${env.SMTP_USER}>`;
  const subject = `Your receipt — Order ${p.orderId.slice(0, 8)}`;
  const html =
    `<h2>Thank you for your order, ${p.customer.customerName}!</h2>` +
    `<p>We’ve received your order and will update you when it ships.</p>` +
    renderOrderSummary(p) +
    `<p style="color:#666;font-size:12px;margin-top:12px">If you have questions, reply to this email or contact ${env.SUPPORT_EMAIL}.</p>`;

  await transport.sendMail({
    from,
    to: p.to,
    subject,
    html,
  });
}
