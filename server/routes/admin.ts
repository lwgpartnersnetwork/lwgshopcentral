// server/routes/admin.ts
import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

// Cache which approval column exists
let approvalColumnCache: "is_approved" | "status" | null = null;

async function getApprovalColumn(): Promise<"is_approved" | "status"> {
  if (approvalColumnCache) return approvalColumnCache;

  // Check for is_approved first (newer schema), then status (fallback schema)
  const { rows } = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'vendors'
      AND column_name IN ('is_approved', 'status')
  `);

  const names = rows.map((r: any) => r.column_name as string);
  if (names.includes("is_approved")) approvalColumnCache = "is_approved";
  else if (names.includes("status")) approvalColumnCache = "status";
  else throw new Error("vendors table has neither 'is_approved' nor 'status' column");

  return approvalColumnCache!;
}

async function setApproval(vendorId: string, approve: boolean) {
  const col = await getApprovalColumn();

  if (col === "is_approved") {
    await db.execute(
      sql`UPDATE "vendors" SET "is_approved" = ${approve} WHERE "id" = ${vendorId}`
    );
  } else {
    // status = 'approved' | 'rejected'
    await db.execute(
      sql`UPDATE "vendors" SET "status" = ${approve ? "approved" : "rejected"} WHERE "id" = ${vendorId}`
    );
  }
}

const router = Router();

/** List vendors (no reference to a non-existent "name" column) */
router.get("/admin/vendors", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const col = await getApprovalColumn();
    const { rows } = await db.execute(
      // Only select columns that definitely exist for your schema
      sql`SELECT id, store_name, created_at, ${sql.raw(col)} AS approval
          FROM "vendors"
          ORDER BY created_at DESC`
    );

    const mapped = rows.map((r: any) => ({
      id: r.id,
      storeName: r.store_name ?? "Vendor",
      status:
        col === "is_approved"
          ? (r.approval ? "approved" : "pending")
          : (r.approval ?? "pending"),
      createdAt: r.created_at,
    }));

    res.json({ vendors: mapped });
  } catch (e) {
    next(e);
  }
});

/** Approve / Reject – Admin paths */
router.post("/admin/vendors/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await setApproval(req.params.id, true);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/admin/vendors/:id/reject", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await setApproval(req.params.id, false);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Generic PATCH (accepts several payload shapes) */
router.patch("/admin/vendors/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    const approve =
      typeof body.isApproved === "boolean"
        ? body.isApproved
        : body.action === "approve"
        ? true
        : body.action === "reject"
        ? false
        : null;

    if (approve === null) {
      return res.status(400).json({
        message: "Provide { isApproved: boolean } or { action: 'approve'|'reject' }",
      });
    }

    await setApproval(req.params.id, approve);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Aliases without /admin in the path (covers other UIs) */
router.post("/vendors/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await setApproval(req.params.id, true);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/vendors/:id/reject", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await setApproval(req.params.id, false);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Unified approval endpoint used by the Admin UI
router.put("/vendors/:id/approval", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const isApproved = Boolean(req.body?.isApproved);
    await setApproval(id, isApproved);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
