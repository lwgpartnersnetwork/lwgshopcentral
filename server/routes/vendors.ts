// server/routes/vendors.ts
import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, users, vendors } from "../db";

const router = Router();

/** ---------- POST /api/vendors/apply ----------
 * Body: { userId?: string, userEmail?: string, storeName: string, description?: string }
 * Creates a vendor application (isApproved=false). Upserts if user already has a row.
 */
const applySchema = z.object({
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  storeName: z.string().min(2, "Store name is required"),
  description: z.string().optional(),
});
router.post("/apply", async (req, res, next) => {
  try {
    const body = applySchema.parse(req.body);

    // Resolve userId if only email is provided
    let userId = body.userId ?? null;
    if (!userId && body.userEmail) {
      const found = await db.query.users.findFirst({
        where: eq(users.email, body.userEmail),
      });
      if (!found) return res.status(400).json({ message: "User not found by email" });
      userId = found.id;
    }
    if (!userId) return res.status(400).json({ message: "userId or userEmail is required" });

    // Does this user already have a vendor row?
    const existing = await db.query.vendors.findFirst({
      where: eq(vendors.userId, userId),
    });

    if (existing) {
      const [updated] = await db
        .update(vendors)
        .set({
          storeName: body.storeName,
          description: body.description ?? existing.description ?? "",
          isApproved: existing.isApproved ?? false,
        })
        .where(eq(vendors.id, existing.id))
        .returning();
      return res.json({ vendor: updated, created: false });
    }

    const [created] = await db
      .insert(vendors)
      .values({
        userId,
        storeName: body.storeName,
        description: body.description ?? "",
        isApproved: false,
      })
      .returning();

    return res.status(201).json({ vendor: created, created: true });
  } catch (err) {
    next(err);
  }
});

/** ---------- GET /api/vendors/pending ----------
 * List all vendor applications waiting for approval
 */
router.get("/pending", async (_req, res, next) => {
  try {
    const rows = await db.query.vendors.findMany({
      where: eq(vendors.isApproved, false),
      with: { user: true },
      orderBy: (v, { desc }) => [desc(v.createdAt)],
    });
    res.json({ vendors: rows });
  } catch (err) {
    next(err);
  }
});

/** ---------- PATCH /api/vendors/:id/approve ----------
 * Approve a vendor application
 */
router.patch("/:id/approve", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [updated] = await db
      .update(vendors)
      .set({ isApproved: true })
      .where(eq(vendors.id, id))
      .returning();
    if (!updated) return res.status(404).json({ message: "Vendor not found" });
    res.json({ vendor: updated });
  } catch (err) {
    next(err);
  }
});

/** ---------- GET /api/vendors/user ----------
 * Query ?id=<userId> or ?email=<email>
 * Returns the vendor row for that user (or null)
 */
router.get("/user", async (req, res, next) => {
  try {
    const id = req.query.id ? String(req.query.id) : null;
    const email = req.query.email ? String(req.query.email) : null;

    let userId: string | null = id;
    if (!userId && email) {
      const found = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      userId = found?.id ?? null;
    }
    if (!userId) return res.status(400).json({ message: "Provide ?id or ?email" });

    const vendor = await db.query.vendors.findFirst({
      where: eq(vendors.userId, userId),
    });
    res.json({ vendor: vendor ?? null });
  } catch (err) {
    next(err);
  }
});

export default router;
