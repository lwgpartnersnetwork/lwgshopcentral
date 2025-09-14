import { Router } from "express";
import { db, users, vendors } from "../db";
import { desc, eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "node:crypto";

const router = Router();

/**
 * POST /api/vendors/apply
 * Body: { storeName, email?, phone?, address?, description?, userId? }
 * - If userId is missing and email exists:
 *     * link to existing user with that email, or
 *     * create a minimal user with a random password.
 * - Store the application in `vendors` with isApproved=false.
 */
router.post("/apply", async (req, res, next) => {
  try {
    const { storeName, email, phone, address, description, userId } =
      req.body ?? {};

    if (!storeName) {
      return res.status(400).json({ message: "storeName is required" });
    }

    let ownerId: string | null = userId ?? null;

    if (!ownerId) {
      if (!email) {
        return res
          .status(400)
          .json({ message: "email is required when userId is missing" });
      }

      // link to existing user by email or create a minimal one
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existing) {
        ownerId = existing.id;
      } else {
        const hashed = await bcrypt.hash(crypto.randomUUID(), 10);
        const inserted = await db
          .insert(users)
          .values({
            email,
            password: hashed,
            firstName: "Vendor",
            lastName: "Applicant",
          })
          .returning({ id: users.id });
        ownerId = inserted[0].id;
      }
    }

    // Upsert: if a vendor row already exists for this user, refresh it and pend again
    const already = await db.query.vendors.findFirst({
      where: eq(vendors.userId, ownerId),
    });

    if (already) {
      await db
        .update(vendors)
        .set({
          storeName,
          description: description ?? already.description ?? "",
          isApproved: false,
        })
        .where(eq(vendors.id, already.id));
      return res.json({ ok: true, id: already.id, status: "pending" });
    }

    const inserted = await db
      .insert(vendors)
      .values({
        userId: ownerId!,
        storeName,
        description: description ?? "",
        isApproved: false,
      })
      .returning({ id: vendors.id });

    res.status(201).json({ ok: true, id: inserted[0].id, status: "pending" });
  } catch (err) {
    next(err);
  }
});

/** GET /api/vendors/pending */
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

/** PATCH /api/vendors/:id/approve */
router.patch("/:id/approve", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [v] = await db
      .update(vendors)
      .set({ isApproved: true })
      .where(eq(vendors.id, id))
      .returning({ userId: vendors.userId });

    // Promote linked user to role=vendor (optional)
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

/** GET /api/vendors/user?userId=... OR ?email=... */
router.get("/user", async (req, res, next) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const email = req.query.email ? String(req.query.email) : undefined;
    if (!userId && !email) {
      return res.status(400).json({ message: "Provide userId or email" });
    }

    let row = null;
    if (userId) {
      row = await db.query.vendors.findFirst({
        where: eq(vendors.userId, userId),
      });
    } else if (email) {
      const u = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (u)
        row = await db.query.vendors.findFirst({
          where: eq(vendors.userId, u.id),
        });
    }

    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

/** GET /api/vendors (approved only unless ?all=1) */
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
