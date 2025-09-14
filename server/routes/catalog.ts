// server/routes/catalog.ts
import { Router, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, categories, vendors, products, orders } from "../db";

const router = Router();

/** GET /api/categories */
router.get("/categories", async (_req: Request, res: Response) => {
  const rows = await db.select().from(categories);
  res.json(rows);
});

/** GET /api/vendors */
router.get("/vendors", async (_req: Request, res: Response) => {
  const rows = await db.select().from(vendors);
  res.json(rows);
});

/** GET /api/products?vendorId=&categoryId= */
router.get("/products", async (req: Request, res: Response) => {
  const vendorId = req.query.vendorId ? String(req.query.vendorId) : undefined;
  const categoryId = req.query.categoryId
    ? String(req.query.categoryId)
    : undefined;

  let where;
  if (vendorId && categoryId) {
    where = and(
      eq(products.vendorId, vendorId),
      eq(products.categoryId, categoryId),
    );
  } else if (vendorId) {
    where = eq(products.vendorId, vendorId);
  } else if (categoryId) {
    where = eq(products.categoryId, categoryId);
  }

  const rows = await db
    .select()
    .from(products)
    .where(where as any)
    .orderBy(desc(products.createdAt));

  res.json(rows);
});

/** ✅ NEW: GET /api/orders (Admin uses this) */
router.get("/orders", async (_req: Request, res: Response) => {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  res.json(rows);
});

/** Optional: GET /api/orders/vendor/:vendorId (Vendor dashboard) */
router.get("/orders/vendor/:vendorId", async (req: Request, res: Response) => {
  const vendorId = String(req.params.vendorId);
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.vendorId, vendorId))
    .orderBy(desc(orders.createdAt));
  res.json(rows);
});

export default router;
