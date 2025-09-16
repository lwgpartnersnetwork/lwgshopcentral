// client/src/pages/admin-dashboard.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { site } from "@/config/site";
import {
  Store,
  Users,
  Package,
  TrendingUp,
  UserPlus,
  Flag,
  Settings,
  Eye,
  Check,
  X,
  Ban,
  Mail,
  RefreshCw,
  Trash2,
  Loader2,
} from "lucide-react";

/* ---------------- helpers ---------------- */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || ""; // same-origin fallback

/** Basic GET with credentials + readable errors */
async function fetchJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const t = await res.text();
      if (t) msg = t;
    } catch {}
    throw new Error(msg);
  }
  try {
    return (await res.json()) as T;
  } catch {
    // Some endpoints may return an empty body on success
    return {} as T;
  }
}

const toNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

const formatK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

/** Try a list of endpoints until one succeeds (covers many backends) */
async function tryJsonEndpoints(
  method: "PATCH" | "PUT" | "POST" | "DELETE",
  paths: string[],
  body?: Record<string, any>,
) {
  let lastErr = "";
  for (const path of paths) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: method === "DELETE" ? undefined : { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(body ?? {}),
        credentials: "include",
      });
      if (res.ok) {
        try {
          return await res.json();
        } catch {
          return {};
        }
      }
      lastErr = `${res.status} ${res.statusText}`;
      try {
        const t = await res.text();
        if (t) lastErr = t;
      } catch {}
    } catch (e: any) {
      lastErr = e?.message || "Network error";
    }
  }
  throw new Error(lastErr || "All endpoints failed");
}

/* ---------------- types ---------------- */
type VendorRow = {
  id: string;
  storeName: string;
  isApproved: boolean;
  createdAt?: string | null;
  userId?: string | null;
  email?: string | null;
  __requestOnly?: boolean;
};

/* ------------- Admin Dashboard ------------- */
export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* ------- data ------- */
  // Pull vendors, normalize to { isApproved: boolean }
  const vendorsQuery = useQuery<VendorRow[]>({
    queryKey: ["admin/vendors"],
    queryFn: async () => {
      const data = await fetchJSON<any>(`${API_BASE}/api/admin/vendors`).catch(() => ({
        vendors: [],
      }));
      const items = Array.isArray(data?.vendors)
        ? data.vendors
        : Array.isArray(data)
        ? data
        : [];
      return items.map(
        (v: any): VendorRow => ({
          id: String(v.id),
          storeName: v.storeName ?? v.store_name ?? "Vendor",
          isApproved:
            typeof v.isApproved === "boolean"
              ? v.isApproved
              : v.status === "approved" || v.approved === true,
          createdAt: v.createdAt ?? v.created_at ?? null,
          userId: v.userId ?? v.user_id ?? null,
          email: v.email ?? v.contact_email ?? null,
        }),
      );
    },
    staleTime: 10_000,
  });

  const ordersQuery = useQuery<any[]>({
    queryKey: ["orders"],
    queryFn: () => fetchJSON(`${API_BASE}/api/orders`).catch(() => []),
    retry: false,
  });

  const productsQuery = useQuery<any[]>({
    queryKey: ["products"],
    queryFn: () => fetchJSON(`${API_BASE}/api/products`).catch(() => []),
    retry: false,
  });

  // Optional vendor requests endpoint
  const vendorRequestsQuery = useQuery<any[]>({
    queryKey: ["vendor-requests"],
    queryFn: async () => {
      try {
        return await fetchJSON(`${API_BASE}/api/vendor-requests`);
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const vendors = vendorsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const vendorRequests = vendorRequestsQuery.data ?? [];

  // Merge vendor requests (as "pending") without duping by id
  const vendorIds = new Set(vendors.map((v) => v.id));
  const mergedVendors: VendorRow[] = [
    ...vendors,
    ...vendorRequests
      .filter((r: any) => !vendorIds.has(String(r.id)))
      .map(
        (r: any): VendorRow => ({
          id: String(r.id),
          storeName: r.storeName ?? r.store_name ?? "Vendor",
          isApproved: false,
          createdAt: r.createdAt ?? r.created_at ?? null,
          userId: r.userId ?? r.user_id ?? null,
          email: r.email ?? r.contact_email ?? null,
          __requestOnly: true,
        }),
      ),
  ];

  /* ------- mutations (with optimistic updates) ------- */
  const updateVendorApprovalMutation = useMutation({
    // variables: { vendorId, isApproved }
    mutationFn: async (vars: { vendorId: string; isApproved: boolean }) => {
      const { vendorId, isApproved } = vars;

      // Bodies some backends accept
      const bodies = [{ isApproved }, { approved: isApproved }, { status: isApproved ? "approved" : "pending" }];

      // Paths many backends use
      const pathsApprove = [
        `/api/admin/vendors/${vendorId}/approval`,
        `/api/admin/vendors/${vendorId}`,
        `/api/vendors/${vendorId}/approval`,
        `/api/vendors/${vendorId}`,
        `/api/admin/vendors/${vendorId}/approve`,
        `/api/vendors/${vendorId}/approve`,
      ];
      const pathsReject = [
        `/api/admin/vendors/${vendorId}/approval`,
        `/api/admin/vendors/${vendorId}`,
        `/api/vendors/${vendorId}/approval`,
        `/api/vendors/${vendorId}`,
        `/api/admin/vendors/${vendorId}/reject`,
        `/api/vendors/${vendorId}/reject`,
      ];
      const paths = isApproved ? pathsApprove : pathsReject;

      // Try PATCH then PUT then POST for each body variant
      for (const body of bodies) {
        try {
          return await tryJsonEndpoints("PATCH", paths, body);
        } catch {}
        try {
          return await tryJsonEndpoints("PUT", paths, body);
        } catch {}
        try {
          return await tryJsonEndpoints("POST", paths, body);
        } catch {}
      }
      throw new Error("No approval endpoint accepted the request");
    },
    // optimistic toggle
    onMutate: async ({ vendorId, isApproved }) => {
      await queryClient.cancelQueries({ queryKey: ["admin/vendors"] });
      const prev = queryClient.getQueryData<VendorRow[]>(["admin/vendors"]);
      queryClient.setQueryData<VendorRow[]>(["admin/vendors"], (old) =>
        (old ?? []).map((v) => (v.id === vendorId ? { ...v, isApproved } : v)),
      );
      return { prev };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["admin/vendors"], ctx.prev);
      const msg = e?.message ? `: ${e.message}` : "";
      toast({ title: "Error", description: `Failed to update vendor approval${msg}`, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-requests"] });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Vendor approval status updated" });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      // Try DELETE on both admin & non-admin routes
      return tryJsonEndpoints("DELETE", [
        `/api/admin/vendors/${vendorId}`,
        `/api/vendors/${vendorId}`,
      ]);
    },
    // optimistic removal
    onMutate: async (vendorId: string) => {
      await queryClient.cancelQueries({ queryKey: ["admin/vendors"] });
      const prev = queryClient.getQueryData<VendorRow[]>(["admin/vendors"]);
      queryClient.setQueryData<VendorRow[]>(["admin/vendors"], (old) =>
        (old ?? []).filter((v) => v.id !== vendorId),
      );
      return { prev };
    },
    onError: (e: any, _vendorId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["admin/vendors"], ctx.prev);
      const msg = e?.message ? `: ${e.message}` : "";
      toast({ title: "Error", description: `Failed to delete vendor${msg}`, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-requests"] });
    },
    onSuccess: () => {
      toast({ title: "Vendor removed" });
    },
  });

  /* ------- handlers ------- */
  const handleApproveVendor = (vendorId: string) => {
    updateVendorApprovalMutation.mutate({ vendorId, isApproved: true });
  };
  const handleRejectVendor = (vendorId: string) => {
    updateVendorApprovalMutation.mutate({ vendorId, isApproved: false });
  };
  const handleDeleteVendor = (vendorId: string) => {
    if (
      confirm(
        "Delete this vendor? This will remove the vendor record. (Products or orders may remain, depending on server rules.)",
      )
    ) {
      deleteVendorMutation.mutate(vendorId);
    }
  };
  const handleBulkApprove = () => {
    const pending = mergedVendors.filter((v) => !v.isApproved);
    if (!pending.length) return;
    pending.forEach((v) => updateVendorApprovalMutation.mutate({ vendorId: v.id, isApproved: true }));
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent("Admin Support Request");
    const body = encodeURIComponent(
      "Hello Support,\n\nI need help with: \n\n- Issue:\n- Steps to reproduce:\n- Expected vs Actual:\n\nThanks,",
    );
    window.location.href = `mailto:${site.supportEmail}?subject=${subject}&body=${body}`;
  };

  const refreshAll = () => {
    vendorsQuery.refetch();
    ordersQuery.refetch();
    productsQuery.refetch();
    vendorRequestsQuery.refetch();
  };

  /* ------- stats ------- */
  const totalVendors = mergedVendors.length;
  const totalCustomers = 48392; // placeholder until a customers API exists
  const totalProducts = products.length;

  const platformRevenueRaw = orders.reduce((sum: number, order: any) => {
    const total = toNumber(order?.total);
    return sum + total * 0.1;
  }, 0);
  const platformRevenueDisplay = formatK(platformRevenueRaw);

  const pendingVendors = mergedVendors.filter((v) => !v.isApproved);
  const todaysOrders =
    orders.filter(
      (o: any) => new Date(o?.createdAt ?? 0).toDateString() === new Date().toDateString(),
    ).length ?? 0;

  /* ------- UI helpers ------- */
  const Loading = <div className="text-sm text-muted-foreground py-6">Loading…</div>;
  const ErrorMsg = ({ msg }: { msg?: string }) => (
    <div className="text-sm text-destructive py-6">{msg || "Something went wrong."}</div>
  );

  const anyActionPending = updateVendorApprovalMutation.isPending || deleteVendorMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8 overflow-x-hidden">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-admin-title">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Comprehensive platform management and analytics</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAll}
            className="px-2 sm:px-3"
            disabled={anyActionPending}
            title="Refresh data"
          >
            {anyActionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="sr-only sm:not-sr-only sm:ml-2">Refresh</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleContactSupport}
            data-testid="button-contact-support"
            className="px-2 sm:px-3"
          >
            <Mail className="h-4 w-4" />
            <span className="sr-only md:not-sr-only md:ml-2">Contact Support</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Total Vendors</p>
                <p className="text-2xl font-bold" data-testid="text-total-vendors">
                  {totalVendors}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Store className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold" data-testid="text-total-customers">
                  {totalCustomers.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold" data-testid="text-total-products">
                  {totalProducts.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Platform Revenue</p>
                <p className="text-2xl font-bold" data-testid="text-platform-revenue">
                  {platformRevenueDisplay}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Support Email</p>
                <p className="text-sm sm:text-base font-medium break-all" data-testid="text-support-email">
                  {site.supportEmail}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleContactSupport}
                data-testid="button-support-email"
                className="self-start sm:self-auto px-2 sm:px-3"
              >
                <Mail className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">Email</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Button
          onClick={handleBulkApprove}
          disabled={!pendingVendors.length || updateVendorApprovalMutation.isPending}
          data-testid="button-approve-vendor"
          title={pendingVendors.length ? "Approve all pending vendors" : "No pending vendors"}
        >
          {updateVendorApprovalMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Approve Vendors ({pendingVendors.length})
        </Button>
        <Button variant="outline" data-testid="button-review-reports">
          <Flag className="mr-2 h-4 w-4" />
          Review Reports
        </Button>
        <Button variant="outline" data-testid="button-platform-settings">
          <Settings className="mr-2 h-4 w-4" />
          Platform Settings
        </Button>
      </div>

      {/* Vendor Management */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Vendor Management</CardTitle>
        </CardHeader>
        <CardContent>
          {vendorsQuery.isLoading ? (
            Loading
          ) : vendorsQuery.isError ? (
            <ErrorMsg msg={(vendorsQuery.error as any)?.message} />
          ) : mergedVendors.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">No vendors yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Store Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedVendors.map((vendor) => (
                    <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Store className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[180px] sm:max-w-none">
                              {vendor.userId || vendor.email || vendor.storeName || "Vendor"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Vendor ID: {String(vendor.id).slice(0, 8)}
                              {vendor.__requestOnly && " • (request)"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-medium">{vendor.storeName || "—"}</TableCell>

                      <TableCell>
                        <Badge
                          variant={vendor.isApproved ? "secondary" : "destructive"}
                          data-testid={`badge-vendor-status-${vendor.id}`}
                        >
                          {vendor.isApproved ? "Approved" : "Pending"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : "—"}
                      </TableCell>

                      <TableCell>
                        <div className="flex space-x-2">
                          {/* View as vendor (read-only) */}
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            data-testid={`button-view-vendor-${vendor.id}`}
                            title="View dashboard (read-only)"
                          >
                            <a href={`/vendor-dashboard?vendorId=${vendor.id}`}>
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>

                          {!vendor.isApproved ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveVendor(vendor.id)}
                                className="text-accent hover:text-accent"
                                data-testid={`button-approve-${vendor.id}`}
                                disabled={updateVendorApprovalMutation.isPending}
                                title="Approve vendor"
                              >
                                {updateVendorApprovalMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectVendor(vendor.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-reject-${vendor.id}`}
                                disabled={updateVendorApprovalMutation.isPending}
                                title="Reject / keep pending"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {/* “Ban” = set isApproved=false (fallback if no special ban endpoint) */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRejectVendor(vendor.id)}
                                data-testid={`button-ban-${vendor.id}`}
                                disabled={updateVendorApprovalMutation.isPending}
                                title="Disable (set unapproved)"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                              {/* Hard delete */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteVendor(vendor.id)}
                                data-testid={`button-delete-${vendor.id}`}
                                disabled={deleteVendorMutation.isPending}
                                title="Delete vendor"
                              >
                                {deleteVendorMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Order Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersQuery.isLoading ? (
              Loading
            ) : ordersQuery.isError ? (
              <ErrorMsg msg={(ordersQuery.error as any)?.message} />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Today's Orders</span>
                  <span className="font-medium" data-testid="text-todays-orders">
                    {todaysOrders}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pending Orders</span>
                  <span className="font-medium" data-testid="text-pending-orders">
                    {orders.filter((o: any) => o?.status === "pending").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Completed Orders</span>
                  <span className="font-medium" data-testid="text-completed-orders">
                    {orders.filter((o: any) => o?.status === "delivered").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span className="font-medium" data-testid="text-total-orders">
                    {orders.length}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {productsQuery.isLoading ? (
              Loading
            ) : productsQuery.isError ? (
              <ErrorMsg msg={(productsQuery.error as any)?.message} />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active Vendors</span>
                  <span className="font-medium" data-testid="text-active-vendors">
                    {mergedVendors.filter((v) => v.isApproved).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pending Approvals</span>
                  <span className="font-medium" data-testid="text-pending-approvals">
                    {pendingVendors.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active Products</span>
                  <span className="font-medium" data-testid="text-active-products">
                    {products.filter((p: any) => p?.isActive).length}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="font-semibold">Platform Health</span>
                  <Badge variant="secondary" data-testid="badge-platform-health">
                    Excellent
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
