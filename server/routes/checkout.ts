// server/routes/checkout.ts
import { Router } from "express";
import { db, products, orders } from "../db";
import { eq } from "drizzle-orm";
import { sendAdminNewOrderEmail, sendBuyerReceiptEmail } from "../email";
import { sendWhatsApp } from "../whatsapp";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      subtotal,
      shippingFee,
      total,
      currency,
      rate,
      paymentMethod,
      notes,
    } = req.body ?? {};

    if (
      !customerName ||
      !customerEmail ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // validate product ids (basic)
    const ids = items.map((i: any) => i.productId);
    const dbProducts = await db
      .select()
      .from(products)
      .where(eq(products.id, ids[0] as any));
    if (!dbProducts?.length)
      return res.status(400).json({ message: "Product not found" });

    // insert order (simplified)
    const [row] = await db
      .insert(orders)
      .values({
        customerId: null,
        vendorId: items[0].vendorId,
        total,
        subtotal,
        shippingFee,
        shippingAddress,
        status: "pending",
        currency,
        rate,
        customerName,
        customerEmail,
        customerPhone,
        paymentMethod,
        notes,
      })
      .returning();

    // fire-and-forget notifications
    (async () => {
      try {
        await Promise.allSettled([
          sendAdminNewOrderEmail(row, items),
          sendBuyerReceiptEmail(row, items),
          sendWhatsApp({
            to: customerPhone,
            text: `Hi ${customerName}, we received your order ${row.id}. Total ${currency} ${total}.`,
          }),
          sendWhatsApp({
            to: process.env.WHATSAPP_ADMIN,
            text: `New order ${row.id} from ${customerName}, total ${currency} ${total}.`,
          }),
        ]);
      } catch {}
    })();

    res.status(201).json({ orderId: row.id });
  } catch (err) {
    next(err);
  }
});

export default router;
