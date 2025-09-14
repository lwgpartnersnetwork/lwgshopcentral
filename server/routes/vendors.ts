// server/routes/vendors.ts
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { db, users, vendors } from "../db";
import { eq, and } from "drizzle-orm";

// Small helpers
const ok = (res: Response, data: unknown) => res.json(data);
const bad = (res: Response, msg = "Bad Request") =>
  res.status(400).json({ message: msg });
const notFound = (res: Response, msg = "Not found") =>
  res.status(404).json({ message: msg });
const fail = (res: Response, err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ message: "Server error" });
};

const router = Router();

/**
 * POST /api/vendors/apply
 * Body:
 * {
 *   userId?: string,
 *   email?: string, firstName?: string, lastName?: string, password?: string,
 *   storeName: string,
 *   description?: string
 * }
 *
 * If email is provided and user does not exist, we create one automatically.
 */
router.post("/vendors/apply", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      email,
      firstName = "Vendor",
      lastName = "User",
      password,
      storeName,
      description = "",
    } = req.body ?? {};

    if (!storeName) return bad(res, "storeName is required");

    let ownerId = userId as string | undefined;

    // If userId not given, try to find or create by email
    if (!ownerId) {
      if (!email) return bad(res, "email is required when userId is missing");

      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existing) {
        ownerId = existing.id;
      } else {
        // Create a minimal user (role defaults to "customer" in the schema)
        const hashed =
          password && String(password).length >= 6
            ? await bcrypt.hash(password, 10)
            : await bcrypt.hash(crypto.randomUUID(), 10);

        const inserted = await db
          .insert(users)
          .values({
            email,
            password: hashed,
            firstName,
            lastName,
            // role stays default "customer" — you can change to "vendor" if you want
          })
          .returning();
        ownerId = inserted[0].id;
      }
    }

    // If the user already has a vendor, return that vendor
    const existingVendor = await db.query.vendors.findFirst({
      where: eq(vendors.userId, ownerId),
    });
    if (existingVendor) return ok(res, existingVendor);

    const created = await db
      .insert(vendors)
      .values({
        userId: ownerId,
        storeName,
        description,
        isApproved: false,
      })
      .returning();

    return ok(res, created[0]);
  } catch (err) {
    return fail(res, err);
  }
});

/** GET /api/vendors/pending */
router.get("/vendors/pending", async (_req, res) => {
  try {
    const rows = await db.query.vendors.findMany({
      where: eq(vendors.isApproved, false),
      with: {
        user: true, // join user for email/name in Admin view
      },
      orderBy: (v, { desc }) => [desc(v.createdAt)],
    });
    return ok(res, rows);
  } catch (err) {
    return fail(res, err);
  }
});

/** PATCH /api/vendors/:id/approve */
router.patch("/vendors/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db
      .update(vendors)
      .set({ isApproved: true })
      .where(eq(vendors.id, id))
      .returning();
    if (!updated.length) return notFound(res, "Vendor not found");
    return ok(res, updated[0]);
  } catch (err) {
    return fail(res, err);
  }
});

/** GET /api/vendors/user/:userId */
router.get("/vendors/user/:userId", async (req, res) => {
  try {
    const row = await db.query.vendors.findFirst({
      where: eq(vendors.userId, req.params.userId),
    });
    if (!row) return notFound(res, "Vendor not found for user");
    return ok(res, row);
  } catch (err) {
    return fail(res, err);
  }
});

/** GET /api/vendors/user?email=... (fallback when you only know the email) */
router.get("/vendors/user", async (req, res) => {
  try {
    const email = String(req.query.email || "");
    if (!email) return bad(res, "email query param required");
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!user) return notFound(res, "User not found");
    const row = await db.query.vendors.findFirst({
      where: eq(vendors.userId, user.id),
    });
    if (!row) return notFound(res, "Vendor not found for user");
    return ok(res, row);
  } catch (err) {
    return fail(res, err);
  }
});

/** GET /api/vendors  (simple list for Admin widgets) */
router.get("/vendors", async (_req, res) => {
  try {
    const rows = await db.query.vendors.findMany({
      with: { user: true },
      orderBy: (v, { desc }) => [desc(v.createdAt)],
    });
    return ok(res, rows);
  } catch (err) {
    return fail(res, err);
  }
});

export default router;


import { Router } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { users, vendors } from "../db"; // vendors & users are re-exported by server/db

const router = Router();

const ApplySchema = z.object({
  storeName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  userId: z.string().optional(), // optional – applicant may not have an account yet
});

/**
 * POST /api/vendors/apply
 * Save (or upsert) an application with isApproved=false.
 */
router.post("/apply", async (req, res, next) => {
  try {
    const data = ApplySchema.parse(req.body);

    // If a userId is present and they already have a vendor row, update it
    if (data.userId) {
      const existing = await db
        .select()
        .from(vendors)
        .where(eq(vendors.userId, data.userId))
        .limit(1);

      if (existing.length) {
        await db
          .update(vendors)
          .set({
            storeName: data.storeName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            description: data.description,
            isApproved: false, // always pend again when re-applying
          })
          .where(eq(vendors.id, existing[0].id));

        return res.status(200).json({ ok: true, id: existing[0].id, status: "pending" });
      }
    }

    // Otherwise insert new pending record
    const inserted = await db
      .insert(vendors)
      .values({
        storeName: data.storeName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        description: data.description,
        userId: data.userId ?? null,
        isApproved: false,
      })
      .returning({ id: vendors.id });

    return res.status(201).json({ ok: true, id: inserted[0].id, status: "pending" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid payload", issues: err.issues });
    }
    next(err);
  }
});

/**
 * GET /api/vendors/pending
 * List applications waiting for approval.
 */
router.get("/pending", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(vendors)
      .where(eq(vendors.isApproved, false))
      .orderBy(desc(vendors.createdAt));
    res.json({ count: rows.length, items: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/vendors/:id/approve
 * Approve a vendor. If vendor has a userId, make that user a 'vendor'.
 */
router.patch("/:id/approve", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [v] = await db
      .update(vendors)
      .set({ isApproved: true })
      .where(eq(vendors.id, id))
      .returning({ id: vendors.id, userId: vendors.userId });

    // Optionally promote the linked user
    if (v?.userId) {
      await db.update(users).set({ role: "vendor" }).where(eq(users.id, v.userId));
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * (Optional) Reject. We simply keep it pending=false + not approved.
 * In a richer model you might store a 'status' and 'reason'.
 */
router.patch("/:id/reject", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    await db
      .update(vendors)
      .set({ isApproved: false })
      .where(eq(vendors.id, id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vendors/user
 * Look up a vendor record by userId OR email (works even if the applicant
 * hasn’t made an account yet).
 *
 * Examples:
 *   /api/vendors/user?userId=abcd
 *   /api/vendors/user?email=alice@example.com
 */
router.get("/user", async (req, res, next) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const email = req.query.email ? String(req.query.email) : undefined;

    if (!userId && !email) {
      return res.status(400).json({ message: "Provide userId or email" });
    }

    const rows = await db
      .select()
      .from(vendors)
      .where(
        userId
          ? eq(vendors.userId, userId)
          : eq(vendors.email, email!)
      )
      .limit(1);

    if (!rows.length) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/vendors
 * List approved vendors by default. Use ?all=1 to show every record.
 */
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
