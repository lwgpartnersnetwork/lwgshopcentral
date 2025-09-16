// client/src/pages/vendor-dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema } from "@shared/schema";
import {
  Plus,
  Package,
  Clock,
  DollarSign,
  Star,
  Edit,
  Trash2,
  Store,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

/* ---------------- helpers ---------------- */
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || ""; // same-origin fallback

async function fetchJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const t = await res.text();
      msg = t || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/** ---------- Types ---------- */
type Vendor = {
  id: string;
  userId: string | null;
  storeName: string;
  isApproved: boolean;
  createdAt: string | null;
  email?: string | null;
};

type Order = {
  id: string;
  vendorId: string;
  customerId: string;
  total: number | string;
  status: string;
  createdAt: string;
};

type Product = {
  id: string;
  vendorId: string;
  name?: string;
  title?: string;
  price: number | string;
  stock?: number | string;
  imageUrl?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
};

/** ---------- Form Schema (UI strings -> server numbers) ---------- */
const productFormSchema = insertProductSchema
  .extend({
    price: z.string().min(1, "Price is required"),
    stock: z.string().min(1, "Stock is required"),
  })
  .partial({ vendorId: true, categoryId: true });

type ProductForm = z.infer<typeof productFormSchema>;

export default function VendorDashboard() {
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ Admin "view as vendor" (read-only) via ?vendorId=...
  const asVendorId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("vendorId")
      : null;
  const viewMode = !!asVendorId;

  /** ---------- Auth hint ---------- */
  useEffect(() => {
    if (!isAuthenticated && !viewMode) {
      toast({
        title: "Please sign in",
        description: "You must sign in to access the vendor dashboard.",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, viewMode, toast]);

  /** ---------- Data: vendor, products, orders ---------- */
  const vendorQuery = useQuery<Vendor>({
    queryKey: viewMode ? ["vendor-by-id", asVendorId] : ["vendor-by-user", user?.id],
    enabled: viewMode ? !!asVendorId : !!user?.id,
    queryFn: async () => {
      const url = viewMode
        ? `${API_BASE}/api/vendors/${asVendorId}`
        : `${API_BASE}/api/vendors/user/${user!.id}`;

      // Support either a raw vendor object OR { vendor: {...} }
      const raw = await fetchJSON<any>(url);
      const v = raw?.vendor ?? raw;

      // Normalize snake_case / alt fields → camelCase
      const isApproved =
        typeof v?.isApproved === "boolean"
          ? v.isApproved
          : typeof v?.is_approved === "boolean"
          ? v.is_approved
          : v?.status === "approved";

      const vendor: Vendor = {
        id: String(v?.id ?? ""),
        userId: v?.userId ?? v?.user_id ?? null,
        storeName: v?.storeName ?? v?.store_name ?? "Vendor",
        isApproved: !!isApproved,
        createdAt: v?.createdAt ?? v?.created_at ?? null,
        email: v?.email ?? v?.contact_email ?? null,
      };

      if (!vendor.id) throw new Error("Vendor not found");
      return vendor;
    },
    retry: false,
  });

  const vendor = vendorQuery.data;

  const productsQuery = useQuery<Product[]>({
    queryKey: ["products-by-vendor", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const list = await fetchJSON<any[]>(
        `${API_BASE}/api/products?vendorId=${vendor!.id}`,
      );
      return (list ?? []).map((p) => ({
        id: String(p.id),
        vendorId: String(p.vendorId ?? p.vendor_id ?? vendor!.id),
        name: p.name ?? p.title ?? "",
        title: p.title,
        price: p.price,
        stock: p.stock ?? p.quantity ?? 0,
        imageUrl: p.imageUrl ?? p.image_url ?? "",
        description: p.description ?? "",
        isActive: typeof p.isActive === "boolean" ? p.isActive : !!p.is_active,
        createdAt: p.createdAt ?? p.created_at,
      })) as Product[];
    },
  });

  const ordersQuery = useQuery<Order[]>({
    queryKey: ["orders-by-vendor", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const list = await fetchJSON<any[]>(
        `${API_BASE}/api/orders/vendor/${vendor!.id}`,
      );
      return (list ?? []).map((o) => ({
        id: String(o.id),
        vendorId: String(o.vendorId ?? o.vendor_id ?? vendor!.id),
        customerId: String(o.customerId ?? o.customer_id ?? ""),
        total: o.total,
        status: o.status ?? "pending",
        createdAt: o.createdAt ?? o.created_at ?? new Date().toISOString(),
      })) as Order[];
    },
  });

  const products = productsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  /** ---------- Form ---------- */
  const form = useForm<ProductForm>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      vendorId: "",
      categoryId: "",
      name: "",
      description: "",
      price: "",
      stock: "",
      imageUrl: "",
    },
  });

  // When vendor loads, inject vendorId into the form defaults
  useEffect(() => {
    if (vendor?.id) {
      form.reset({
        vendorId: vendor.id,
        categoryId: "",
        name: "",
        description: "",
        price: "",
        stock: "",
        imageUrl: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.id]);

  /** ---------- Mutations ---------- */
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const payload = {
        ...data,
        vendorId: vendor!.id,
        price: Number(data.price),
        stock: Number(data.stock),
      };
      await apiRequest("POST", "/api/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["products-by-vendor", vendor?.id],
      });
      setIsProductDialogOpen(false);
      form.reset({
        vendorId: vendor?.id ?? "",
        categoryId: "",
        name: "",
        description: "",
        price: "",
        stock: "",
        imageUrl: "",
      });
      toast({ title: "Product created successfully" });
    },
    onError: (e: any) => {
      toast({
        title: "Failed to create product",
        description: e?.message || "Please check required fields.",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["products-by-vendor", vendor?.id],
      });
      toast({ title: "Product deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  /** ---------- Derived stats ---------- */
  const totalProducts = products.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  const now = new Date();
  const monthlyRevenue = orders
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  // ✅ Only real vendor can manage (admin "view as" is read-only)
  const canManage = !!vendor?.isApproved && !viewMode;

  /** ---------- UI ---------- */
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold flex items-center gap-2"
          data-testid="text-dashboard-title"
        >
          <Store className="h-7 w-7" /> Vendor Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your products, orders, and store performance
        </p>
      </div>

      {/* Read-only banner for admin view */}
      {viewMode && (
        <div className="mb-4">
          <Badge variant="secondary">Admin view — read-only</Badge>
        </div>
      )}

      {/* Vendor Status */}
      <Card className="mb-8">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Store</p>
            <p className="text-lg font-semibold">{vendor?.storeName ?? "—"}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Status</span>
            {vendorQuery.isLoading ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking…
              </Badge>
            ) : vendorQuery.isError || !vendor ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-4 w-4" /> Not a vendor yet
              </Badge>
            ) : vendor.isApproved ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Approved
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-4 w-4" /> Pending approval
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold" data-testid="text-total-products">
                  {totalProducts}
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
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold" data-testid="text-pending-orders">
                  {pendingOrders}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold" data-testid="text-monthly-revenue">
                  ${monthlyRevenue.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Store Rating</p>
                <p className="text-2xl font-bold" data-testid="text-store-rating">
                  4.8
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <Star className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-product" disabled={!canManage}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>

            {!canManage && (
              <div className="mb-4">
                <Badge variant="destructive">
                  {viewMode ? "Admin view is read-only" : "Your store is pending admin approval"}
                </Badge>
              </div>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => {
                  if (!canManage) {
                    return toast({
                      title: "Not allowed",
                      description: viewMode
                        ? "You’re viewing this store in read-only mode."
                        : "An admin must approve your store before adding products.",
                      variant: "destructive",
                    });
                  }
                  createProductMutation.mutate(data);
                })}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter product name"
                          {...field}
                          data-testid="input-product-name"
                          disabled={!canManage}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          {...field}
                          data-testid="input-product-description"
                          disabled={!canManage}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            data-testid="input-product-price"
                            disabled={!canManage}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            data-testid="input-product-stock"
                            disabled={!canManage}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          data-testid="input-product-image"
                          disabled={!canManage}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProductDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProductMutation.isPending || !canManage}
                    data-testid="button-create-product"
                  >
                    {createProductMutation.isPending ? "Creating..." : "Create Product"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Button variant="outline" data-testid="button-analytics">
          {/* Placeholder for future analytics modal/page */}
          View Analytics
        </Button>
      </div>

      {/* Products Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Products</CardTitle>
        </CardHeader>
        <CardContent>
          {productsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading products…</div>
          ) : products.length === 0 ? (
            <div className="text-sm text-muted-foreground">No products yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const displayName = product.name ?? product.title ?? "(no name)";
                    const price = Number(product.price ?? 0);
                    const stock = product.stock ?? 0;
                    const img = product.imageUrl || "";
                    const desc = product.description ? String(product.description) : "";

                    return (
                      <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {img ? (
                              <img
                                src={img}
                                alt={displayName}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted" />
                            )}
                            <div>
                              <p className="font-medium">{displayName}</p>
                              {desc && (
                                <p className="text-sm text-muted-foreground">
                                  {desc.length > 50 ? `${desc.slice(0, 50)}…` : desc}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">${price.toFixed(2)}</TableCell>
                        <TableCell>{String(stock)}</TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? "secondary" : "destructive"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-edit-${product.id}`}
                              disabled={!canManage}
                              title={canManage ? "Edit" : "Read-only"}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!canManage) {
                                  toast({
                                    title: "Read-only",
                                    description: viewMode
                                      ? "Admin view is read-only."
                                      : "Your store must be approved first.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                if (confirm("Delete this product?")) {
                                  deleteProductMutation.mutate(product.id);
                                }
                              }}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-${product.id}`}
                              disabled={!canManage || deleteProductMutation.isPending}
                              title={canManage ? "Delete" : "Read-only"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orders ?? []).slice(0, 10).map((order) => (
                  <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                    <TableCell className="font-mono text-sm">
                      #{order.id.substring(0, 8)}
                    </TableCell>
                    <TableCell>{order.customerId}</TableCell>
                    <TableCell className="font-medium">
                      ${Number(order.total || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === "delivered"
                            ? "secondary"
                            : order.status === "pending"
                            ? "destructive"
                            : "default"
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}

                {!orders?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      No orders yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
