// client/src/lib/api.ts
export type Vendor = {
  id: string;
  storeName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || ""; // same-origin fallback

export async function listVendors(): Promise<Vendor[]> {
  const res = await fetch(`${API_BASE}/api/admin/vendors`);
  if (!res.ok) throw new Error(`Failed to load vendors: ${res.status}`);
  const data = await res.json();
  return data.vendors as Vendor[];
}

export async function setVendorApproval(id: string, isApproved: boolean) {
  const res = await fetch(`${API_BASE}/api/vendors/${id}/approval`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isApproved }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Approval failed: ${res.status} ${err}`);
  }
  return res.json(); // { ok: true }
}
