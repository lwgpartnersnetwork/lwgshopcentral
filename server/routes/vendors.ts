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
