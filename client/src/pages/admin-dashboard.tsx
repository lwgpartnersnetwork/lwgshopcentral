import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  Ban
} from 'lucide-react';

export default function AdminDashboard() {
  const { toast } = useToast();

  // Fetch data
  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders'],
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const updateVendorApprovalMutation = useMutation({
    mutationFn: async ({ vendorId, isApproved }: { vendorId: string; isApproved: boolean }) => {
      await apiRequest('PUT', `/api/vendors/${vendorId}/approval`, { isApproved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      toast({
        title: 'Success',
        description: 'Vendor approval status updated',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update vendor approval',
        variant: 'destructive',
      });
    },
  });

  const handleApproveVendor = (vendorId: string) => {
    updateVendorApprovalMutation.mutate({ vendorId, isApproved: true });
  };

  const handleRejectVendor = (vendorId: string) => {
    updateVendorApprovalMutation.mutate({ vendorId, isApproved: false });
  };

  // Calculate stats
  const totalVendors = vendors.length;
  const totalCustomers = 48392; // This would come from a real API
  const totalProducts = products.length;
  const platformRevenue = orders.reduce((sum: number, order: any) => 
    sum + (parseFloat(order.total) * 0.1), 0); // Assuming 10% platform fee

  const pendingVendors = vendors.filter((vendor: any) => !vendor.isApproved);
  const todaysOrders = orders.filter((order: any) => 
    new Date(order.createdAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-admin-title">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Comprehensive platform management and analytics
        </p>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <div className="flex items-center justify-between">
              <div>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Platform Revenue</p>
                <p className="text-2xl font-bold" data-testid="text-platform-revenue">
                  ${platformRevenue.toFixed(0)}K
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
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
                  <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{vendor.userId}</p>
                          <p className="text-sm text-muted-foreground">Vendor ID: {vendor.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{vendor.storeName}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={vendor.isApproved ? "secondary" : "destructive"}
                        data-testid={`badge-vendor-status-${vendor.id}`}
                      >
                        {vendor.isApproved ? 'Approved' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" data-testid={`button-view-vendor-${vendor.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!vendor.isApproved && (
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
                        )}
                        {vendor.isApproved && (
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
        </CardContent>
      </Card>

      {/* Platform Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Order Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Today's Orders</span>
                <span className="font-medium" data-testid="text-todays-orders">{todaysOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pending Orders</span>
                <span className="font-medium" data-testid="text-pending-orders">
                  {orders.filter((order: any) => order.status === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Completed Orders</span>
                <span className="font-medium" data-testid="text-completed-orders">
                  {orders.filter((order: any) => order.status === 'delivered').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-medium" data-testid="text-total-orders">{orders.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active Vendors</span>
                <span className="font-medium" data-testid="text-active-vendors">
                  {vendors.filter((vendor: any) => vendor.isApproved).length}
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
                  {products.filter((product: any) => product.isActive).length}
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <span className="font-semibold">Platform Health</span>
                <Badge variant="secondary" data-testid="badge-platform-health">Excellent</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
