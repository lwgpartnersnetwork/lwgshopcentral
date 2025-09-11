import { useQuery, useMutation } from "@tanstack/react-query";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
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
} from "lucide-react";

const SUPPORT_EMAIL = "lwgpartnersnetwork@gmail.com";

// ---------- helpers ----------
const toNumber = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

const formatK = (n: number) => {
  if (n >= 1000000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

export default function AdminDashboard() {
  const { toast } = useToast();

  // -------- data --------
  const vendorsQuery = useQuery<any[]>({ queryKey: ["/api/vendors"] });
  const ordersQuery = useQuery<any[]>({ queryKey: ["/api/orders"] });
  const productsQuery = useQuery<any[]>({ queryKey: ["/api/products"] });

  const vendors = vendorsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const products = productsQuery.data ?? [];

  // -------- mutations --------
  const updateVendorApprovalMutation = useMutation({
    mutationFn: async ({
      vendorId,
      isApproved,
    }: {
      vendorId: string;
      isApproved: boolean;
    }) => {
      await apiRequest("PUT", `/api/vendors/${vendorId}/approval`, {
        isApproved,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: "Vendor approval status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update vendor approval",
        variant: "destructive",
      });
    },
  });

  // -------- handlers --------
  const handleApproveVendor = (vendorId: string) => {
    updateVendorApprovalMutation.mutate({ vendorId, isApproved: true });
  };

  const handleRejectVendor = (vendorId: string) => {
    updateVendorApprovalMutation.mutate({ vendorId, isApproved: false });
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent("Admin Support Request");
    const body = encodeURIComponent(
      "Hello Support,\n\nI need help with: \n\n- Issue:\n- Steps to reproduce:\n- Expected vs Actual:\n\nThanks,"
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const refreshAll = () => {
    vendorsQuery.refetch();
    ordersQuery.refetch();
    productsQuery.refetch();
  };

  // -------- stats --------
  const totalVendors = vendors.length;
  const totalCustomers = 48392; // placeholder until you have a real customers API
  const totalProducts = products.length;

  // platform fee = 10% of each order.total (if present)
  const platformRevenueRaw = orders.reduce((sum: number, order: any) => {
    const total = toNumber(order?.total);
    return sum + total * 0.1;
  }, 0);

  const platformRevenueDisplay = formatK(platformRevenueRaw);

  const pendingVendors = vendors.filter((v: any) => !v?.isApproved);
  const todaysOrders =
    orders.filter(
      (o: any) =>
        new Date(o?.createdAt ?? 0).toDateString() ===
        new Date().toDateString()
    ).length ?? 0;

  // -------- ui helpers --------
  const Loading = (
    <div className="text-sm text-muted-foreground py-6">Loading…</div>
  );

  const ErrorMsg = ({ msg }: { msg?: string }) => (
    <div className="text-sm text-destructive py-6">
      {msg || "Something went wrong."}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-admin-title">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive platform management and analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refreshAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleContactSupport}
            data-testid="button-contact-support"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p
                  className="text-2xl font-bold"
                  data-testid="text-total-customers"
                >
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p
                  className="text-2xl font-bold"
                  data-testid="text-total-products"
                >
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Platform Revenue</p>
                <p
                  className="text-2xl font-bold"
                  data-testid="text-platform-revenue"
                >
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Support Email</p>
                <p className="text-lg font-medium" data-testid="text-support-email">
                  {SUPPORT_EMAIL}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleContactSupport}
                data-testid="button-support-email"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Button data-testid="button-approve-vendor">
          <UserPlus className="mr-2 h-4 w-4" />
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
          ) : vendors.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">
              No vendors yet.
            </div>
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
                  {vendors.map((vendor: any) => (
                    <TableRow
                      key={vendor.id}
                      data-testid={`row-vendor-${vendor.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Store className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{vendor.userId}</p>
                            <p className="text-sm text-muted-foreground">
                              Vendor ID: {String(vendor.id).slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {vendor.storeName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={vendor.isApproved ? "secondary" : "destructive"}
                          data-testid={`badge-vendor-status-${vendor.id}`}
                        >
                          {vendor.isApproved ? "Approved" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vendor.createdAt
                          ? new Date(vendor.createdAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-view-vendor-${vendor.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!vendor.isApproved ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveVendor(vendor.id)}
                                className="text-accent hover:text-accent"
                                data-testid={`button-approve-${vendor.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectVendor(vendor.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-reject-${vendor.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-ban-${vendor.id}`}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
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
                  <span
                    className="font-medium"
                    data-testid="text-completed-orders"
                  >
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
                    {vendors.filter((v: any) => v?.isApproved).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pending Approvals</span>
                  <span
                    className="font-medium"
                    data-testid="text-pending-approvals"
                  >
                    {pendingVendors.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active Products</span>
                  <span
                    className="font-medium"
                    data-testid="text-active-products"
                  >
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
