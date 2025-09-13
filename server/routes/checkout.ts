// server/routes/checkout.ts
import { Router } from "express";
import { z } from "zod";
import { db } from "../db"; // your drizzle db instance
import { orders, orderItems, products, vendors } from "../db"; // adjust import to where your tables are exported
import { eq } from "drizzle-orm";
import { sendEmail } from "../email";
import { sendWhatsApp } from "../whatsapp";
import { env } from "../env";

export const checkoutRouter = Router();

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional().default(""),
  city: z.string().min(1),
  region: z.string().optional().default(""),
  country: z.string().min(1),
});

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const bodySchema = z.object({
  customerId: z.string().optional(), // guests allowed
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional().default(""),
  items: z.array(itemSchema).min(1),
  shippingAddress: addressSchema,
  paymentMethod: z.enum([
    "cash_on_delivery",
    "bank_transfer",
    "mobile_money",
    "card",
  ]),
  notes: z.string().optional().default(""),
  // allow client to include current rate/currency, else default
  currency: z.string().optional().default(env.CURRENCY.default),
  rate: z.number().optional().default(env.CURRENCY.usdRate),
});

checkoutRouter.post("/", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }
  const data = parsed.data;

  // load product info
  const ids = data.items.map((i) => i.productId);
  const dbProducts = await db
    .select()
    .from(products)
    .where((p) => p.id.in(ids));

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));
  let subtotal = 0;

  const itemsExpanded = data.items.map((i) => {
    const p = productMap.get(i.productId);
    if (!p) throw new Error(`Product not found: ${i.productId}`);
    const unit = Number(p.price);
    const line = unit * i.quantity;
    subtotal += line;
    return {
      productId: i.productId,
      vendorId: p.vendorId,
      quantity: i.quantity,
      price: unit, // stored in base currency (NLE)
      name: p.name,
      imageUrl: p.imageUrl,
    };
  });

  const shippingFee = 0; // customize later
  const total = subtotal + shippingFee;

  // choose vendorId for the order – first item’s vendor
  const vendorId = itemsExpanded[0].vendorId;

  // create order
  const [inserted] = await db
    .insert(orders)
    .values({
      customerId: data.customerId ?? null,
      vendorId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone || null,
      currency: data.currency,
      rate: data.rate,
      subtotal,
      shippingFee,
      total,
      paymentMethod: data.paymentMethod,
      status: "pending",
      shippingAddress: data.shippingAddress as any,
      notes: data.notes || null,
      createdAt: new Date(),
    })
    .returning();

  await db.insert(orderItems).values(
    itemsExpanded.map((i) => ({
      orderId: inserted.id,
      productId: i.productId,
      vendorId: i.vendorId,
      quantity: i.quantity,
      price: i.price,
      name: i.name,
      imageUrl: i.imageUrl,
    })),
  );

  /** Email receipt */
  const fmtMoney = (n: number) =>
    `${data.currency} ${n.toFixed(2)}` +
    (data.currency !== "NLE" ? ` (rate ${data.rate})` : "");

  const itemsHtml = itemsExpanded
    .map(
      (i) =>
        `<tr>
          <td>${i.name}</td>
          <td style="text-align:center">${i.quantity}</td>
          <td style="text-align:right">${fmtMoney(i.price)}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial">
      <h2>Thanks for your order, ${data.customerName}!</h2>
      <p>Order ID: <b>${inserted.id.slice(0, 8)}</b></p>
      <table width="100%" cellspacing="0" cellpadding="6" style="border:1px solid #eee">
        <thead>
          <tr>
            <th align="left">Item</th>
            <th align="center">Qty</th>
            <th align="right">Unit</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr><td colspan="2" align="right"><b>Subtotal</b></td><td align="right">${fmtMoney(subtotal)}</td></tr>
          <tr><td colspan="2" align="right"><b>Shipping</b></td><td align="right">${fmtMoney(shippingFee)}</td></tr>
          <tr><td colspan="2" align="right"><b>Total</b></td><td align="right">${fmtMoney(total)}</td></tr>
        </tfoot>
      </table>
      <p><b>Payment method:</b> ${data.paymentMethod.replace(/_/g, " ")}</p>
      <p><b>Ship to:</b> ${data.shippingAddress.line1}, ${data.shippingAddress.city}, ${data.shippingAddress.country}</p>
      <p style="color:#666">If you have questions, reply here or email <a href="mailto:${env.SUPPORT_EMAIL}">${env.SUPPORT_EMAIL}</a>.</p>
    </div>
  `;

  await sendEmail({
    to: [data.customerEmail, env.SUPPORT_EMAIL],
    subject: `LWG Order ${inserted.id.slice(0, 8)} — ${fmtMoney(total)}`,
    html,
    text: `Order ${inserted.id} total ${fmtMoney(total)}.`,
  });

  /** WhatsApp (optional) */
  if (env.TWILIO) {
    const msg = `LWG: Order ${inserted.id.slice(0, 8)} placed.\nTotal: ${fmtMoney(
      total,
    )}\nPayment: ${data.paymentMethod.replace(/_/g, " ")}\nThank you!`;

    if (data.customerPhone) {
      await sendWhatsApp(data.customerPhone, msg);
    }
    if (env.TWILIO.admin) {
      await sendWhatsApp(env.TWILIO.admin, `ADMIN: ${msg}`);
    }
  }

  return res.json({ ok: true, order: inserted });
});
