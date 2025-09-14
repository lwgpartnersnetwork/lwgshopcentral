// server/routes/vendors.ts
import { Router } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, vendors, users } from "../db";

/**
 * Mount this in server/index.ts like:
 *   import vendorsRouter from "./routes/vendors";
 *   app.use("/api/vendors", vendorsRouter);
 *
 * Endpoints:
 *   POST   /api/vendors/apply          -> submit or update a pending application
 *   GET    /api/vendors/pending        -> list pending applications
 *   PATCH  /api/vendors/:id/approve    -> approve (and promote linked user to 'vendor')
 *   PATCH  /api/vendors/:id/reject     -> keep record, ensure isApproved=false
 *   GET    /api/vendors/user?userId=...|email=... -> lookup a vendor row
 *   GET    /api/vendors                -> list approved vendors (use ?all=1 to list all)
 */

const router = Router();

const ApplySchema = z.object({
  storeName: z.string().min(2, "storeName is required"),
  description: z.string().optional(),
  // contact info so Admin can reach out even if there is no account yet
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  // if the applicant is logged in, we’ll link the user
  userId: z.string().uuid().optional(),
});

// Create or update a pending vendor application
router.post("/apply", async (req, res, next) => {
  try {
    const data = ApplySchema.parse(req.body);

    // If this user already has a vendor row, update it and pend again
    if (data.userId) {
      const current = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.userId, data.userId))
        .limit(1);

      if (current.length) {
        await db
          .update(vendors)
          .set({
            storeName: data.storeName,
            description: data.description,
            email: data.email,
            phone: data.phone,
            address: data.address,
            isApproved: false,
          })
          .where(eq(vendors.id, current[0].id));

        return res
          .status(200)
          .json({ ok: true, id: current[0].id, status: "pending" });
      }
    }

    // Otherwise, insert a brand-new pending record (userId may be null)
    const [row] = await db
      .insert(vendors)
      .values({
        storeName: data.storeName,
        description: data.description,
        email: data.email,
        phone: data.phone,
        address: data.address,
        userId: data.userId ?? null,
        isApproved: false,
      })
      .returning({ id: vendors.id });

    res.status(201).json({ ok: true, id: row.id, status: "pending" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid payload", issues: err.issues });
    }
    next(err);
  }
});

// List all pending vendor applications
router.get("/pending", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(vendors)
      .where(eq(vendors.isApproved, false))
      .orderBy(desc(vendors.createdAt));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Approve a vendor; if linked to a user, promote them
router.patch("/:id/approve", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [updated] = await db
      .update(vendors)
      .set({ isApproved: true })
      .where(eq(vendors.id, id))
      .returning({ id: vendors.id, userId: vendors.userId });

    if (!updated) return res.status(404).json({ message: "Vendor not found" });

    if (updated.userId) {
      await db
        .update(users)
        .set({ role: "vendor" })
        .where(eq(users.id, updated.userId));
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Reject (keeps the record, ensures it's not approved)
router.patch("/:id/reject", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [v] = await db
      .update(vendors)
      .set({ isApproved: false })
      .where(eq(vendors.id, id))
      .returning({ id: vendors.id });
    if (!v) return res.status(404).json({ message: "Vendor not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Lookup a vendor record by userId OR email (works even if no account yet)
router.get("/user", async (req, res, next) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const email = req.query.email ? String(req.query.email) : undefined;

    if (!userId && !email)
      return res.status(400).json({ message: "Provide userId or email" });

    const rows = await db
      .select()
      .from(vendors)
      .where(userId ? eq(vendors.userId, userId) : eq(vendors.email, email!))
      .limit(1);

    if (!rows.length) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// List vendors (approved by default). Use ?all=1 to include pending.
router.get("/", async (req, res, next) => {
  try {
    const all = req.query.all === "1" || req.query.all === "true";
    const rows = await db
      .select()
      .from(vendors)
      .where(all ? undefined : eq(vendors.isApproved, true))
      .orderBy(desc(vendors.createdAt));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
