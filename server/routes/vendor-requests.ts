import { Router } from "express";
import { db, vendors, users } from "../db";
import { desc, eq } from "drizzle-orm";

const router = Router();

/** GET /api/vendor-requests  -> list pending as “applications” */
router.get("/", async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: vendors.id,
        storeName: vendors.storeName,
        description: vendors.description,
        createdAt: vendors.createdAt,
        userId: users.id,
        email: users.email,
      })
      .from(vendors)
      .leftJoin(users, eq(users.id, vendors.userId))
      .where(eq(vendors.isApproved, false))
      .orderBy(desc(vendors.createdAt));

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/vendor-requests/:id/approve -> approve vendor */
router.patch("/:id/approve", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [v] = await db
      .update(vendors)
      .set({ isApproved: true })
      .where(eq(vendors.id, id))
      .returning({ userId: vendors.userId });

    if (v?.userId) {
      await db
        .update(users)
        .set({ role: "vendor" })
        .where(eq(users.id, v.userId));
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/vendor-requests/:id/reject -> keep pending=false (no-op), return ok */
router.patch("/:id/reject", async (req, res, next) => {
  try {
    // You could also delete the row or add a separate status column.
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
