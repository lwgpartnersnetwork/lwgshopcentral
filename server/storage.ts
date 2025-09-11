// server/storage.ts
import { client } from "./db";
import { randomUUID } from "crypto";

// --- helpers ----------------------------------------------------
type VendorRow = {
  id: string;
  user_id: string;
  store_name: string;
  is_approved: boolean;
  created_at: Date | string;
};

function rowToVendor(r: VendorRow) {
  return {
    id: r.id,
    userId: r.user_id,
    storeName: r.store_name,
    isApproved: r.is_approved,
    createdAt:
      typeof r.created_at === "string" ? new Date(r.created_at) : r.created_at,
  };
}

// --- VENDOR API -------------------------------------------------

export async function createVendor(input: {
  userId: string;
  storeName: string;
}) {
  const id = randomUUID().slice(0, 8); // keep ids short like your sample "vendor1"

  // Force all new vendors to be PENDING (is_approved = false)
  const q = `
    INSERT INTO vendors (id, user_id, store_name, is_approved, created_at)
    VALUES ($1, $2, $3, false, NOW())
    RETURNING id, user_id, store_name, is_approved, created_at
  `;

  const { rows } = await client.query(q, [id, input.userId, input.storeName]);
  return rowToVendor(rows[0]);
}

export async function getAllVendors() {
  const q = `
    SELECT id, user_id, store_name, is_approved, created_at
    FROM vendors
    ORDER BY created_at DESC
  `;
  const { rows } = await client.query(q);
  return rows.map(rowToVendor);
}

export async function getVendorByUserId(userId: string) {
  const q = `
    SELECT id, user_id, store_name, is_approved, created_at
    FROM vendors
    WHERE user_id = $1
    LIMIT 1
  `;
  const { rows } = await client.query(q, [userId]);
  return rows[0] ? rowToVendor(rows[0]) : null;
}

export async function updateVendorApproval(
  vendorId: string,
  isApproved: boolean,
) {
  const q = `
    UPDATE vendors
    SET is_approved = $2
    WHERE id = $1
  `;
  await client.query(q, [vendorId, isApproved]);
  return { ok: true };
}

// If you already export an object named `storage` elsewhere, you can export it here too:
export const storage = {
  createVendor,
  getAllVendors,
  getVendorByUserId,
  updateVendorApproval,
};
