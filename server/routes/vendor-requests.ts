// server/routes/vendor-requests.ts
import { Router } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, vendorApplications, users, vendors } from "../db";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const SubmitSchema = z.object({
  storeName: z.string().min(2, "storeName is required"),
  description: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  userId: z.string().uuid().optional(), // applicant might not have an account
});

const router = Router();

// ------------------------------------------------------------------
// POST /api/vendor-requests
// Public endpoint to submit a vendor application (status -> 'pending')
// If the same user re-submits, we update the existing pending row.
// ------------------------------------------------------------------
router.post("/", async (req, res, next) => {
  try {
    const data = SubmitSchema.parse(req.body);

    // If userId present, upsert by that user
    if (data.userId) {
      const existing = await db
        .select({
          id: vendorApplications.id,
          status: vendorApplications.status,
        })
        .from(vendorApplications)
        .where(eq(vendorApplications.userId, data.userId))
        .limit(1);

      if (existing.length) {
        const [row] = await db
          .update(vendorApplications)
          .set({
            storeName: data.storeName,
            description: data.description,
            email: data.email,
            phone: data.phone,
            address: data.address,
            status: "pending",
          })
          .where(eq(vendorApplications.id, existing[0].id))
          .returning();

        return res
          .status(200)
          .json({ ok: true, id: row.id, status: row.status });
      }
    }

    // Otherwise insert a new pending application (maybe only with email/phone)
    const [inserted] = await db
      .insert(vendorApplications)
      .values({
        storeName: data.storeName,
        description: data.description,
        email: data.email,
        phone: data.phone,
        address: data.address,
        userId: data.userId ?? null,
        status: "pending",
      })
      .returning({
        id: vendorApplications.id,
        status: vendorApplications.status,
      });

    res
      .status(201)
      .json({ ok: true, id: inserted.id, status: inserted.status });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid payload", issues: err.issues });
    }
    next(err);
  }
});

// ------------------------------------------------------------------
// GET /api/vendor-requests
// Admin: list all pending applications
// ------------------------------------------------------------------
router.get("/", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(vendorApplications)
      .where(eq(vendorApplications.status, "pending"))
      .orderBy(desc(vendorApplications.createdAt));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------
// GET /api/vendor-requests/:id
// Admin: fetch a single application (any status)
// ------------------------------------------------------------------
router.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const rows = await db
      .select()
      .from(vendorApplications)
      .where(eq(vendorApplications.id, id))
      .limit(1);
    if (!rows.length)
      return res.status(404).json({ message: "application not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------
// PATCH /api/vendor-requests/:id/approve
// Admin: approve -> mark application approved
// If we can resolve a user (by userId or email), we upsert a vendors row
// and promote that user to role 'vendor'.
// NOTE: If your vendors.userId is NOT NULL, we only create vendor when a user exists.
// ------------------------------------------------------------------
router.patch("/:id/approve", async (req, res, next) => {
  try {
    const id = String(req.params.id);

    // 1) Approve the application first
    const [appRow] = await db
      .update(vendorApplications)
      .set({ status: "approved" })
      .where(eq(vendorApplications.id, id))
      .returning();

    if (!appRow)
      return res.status(404).json({ message: "application not found" });

    // 2) Try to find a user to link
    let userRow: { id: string; email: string; role: string } | undefined =
      undefined;

    if (appRow.userId) {
      const rows = await db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, appRow.userId))
        .limit(1);
      userRow = rows[0];
    } else if (appRow.email) {
      const rows = await db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.email, appRow.email))
        .limit(1);
      userRow = rows[0];
    }

    let vendorId: string | undefined;

    // 3) If we found a user, upsert a vendor record and promote role
    if (userRow) {
      // Does this user already have a vendor row?
      const existingVendor = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.userId, userRow.id))
        .limit(1);

      if (existingVendor.length) {
        const [v] = await db
          .update(vendors)
          .set({
            storeName: appRow.storeName,
            description: appRow.description ?? "",
            // If your vendors table has these fields:
            // email: appRow.email ?? null,
            // phone: appRow.phone ?? null,
            // address: appRow.address ?? null,
            isApproved: true,
          })
          .where(eq(vendors.id, existingVendor[0].id))
          .returning({ id: vendors.id });
        vendorId = v.id;
      } else {
        const [v] = await db
          .insert(vendors)
          .values({
            userId: userRow.id,
            storeName: appRow.storeName,
            description: appRow.description ?? "",
            // If your vendors table has these fields, uncomment:
            // email: appRow.email ?? null,
            // phone: appRow.phone ?? null,
            // address: appRow.address ?? null,
            isApproved: true,
          })
          .returning({ id: vendors.id });
        vendorId = v.id;
      }

      // promote user to vendor (idempotent)
      await db
        .update(users)
        .set({ role: "vendor" })
        .where(eq(users.id, userRow.id));
    }

    res.json({ ok: true, application: appRow, vendorId });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------
// PATCH /api/vendor-requests/:id/reject
// Admin: reject -> mark application rejected
// ------------------------------------------------------------------
router.patch("/:id/reject", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [appRow] = await db
      .update(vendorApplications)
      .set({ status: "rejected" })
      .where(eq(vendorApplications.id, id))
      .returning();

    if (!appRow)
      return res.status(404).json({ message: "application not found" });
    res.json({ ok: true, application: appRow });
  } catch (err) {
    next(err);
  }
});

export default router;
