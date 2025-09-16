// client/src/App.tsx
import { useEffect } from "react";
import { Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/navbar";
import Footer from "@/components/footer";
import { CartSidebar } from "@/components/cart-sidebar";
import { CurrencyProvider } from "@/lib/currency";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ProductDetails from "@/pages/product-details";
import VendorDashboard from "@/pages/vendor-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import Categories from "@/pages/categories";
import Support from "@/pages/support";
import BecomeVendor from "@/pages/become-vendor";
import Checkout from "@/pages/checkout";
import NotFound from "@/pages/not-found";

/** Type for your /products/:id route params */
type ProductRouteParams = { id: string };

/* --- Debug helper so we can see which route rendered --- */
function RouteProbe({ tag }: { tag: string }) {
  useEffect(() => {
    console.log(`[route] ${tag} mounted`);
  }, [tag]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <Route path="/">
        <>
          <RouteProbe tag="home /" />
          <Home />
        </>
      </Route>

      <Route path="/login">
        <>
          <RouteProbe tag="login" />
          <Login />
        </>
      </Route>

      <Route path="/register">
        <>
          <RouteProbe tag="register" />
          <Register />
        </>
      </Route>

      <Route path="/products/:id">
        {(params: ProductRouteParams) => (
          <>
            <RouteProbe tag={`product ${params.id}`} />
            {/* ✅ strong typing instead of `as any` */}
            <ProductDetails params={params} />
          </>
        )}
      </Route>

      <Route path="/vendor-dashboard">
        <>
          <RouteProbe tag="vendor-dashboard" />
          <VendorDashboard />
        </>
      </Route>

      {/* Admin dashboard (original path) */}
      <Route path="/admin-dashboard">
        <>
          <RouteProbe tag="admin-dashboard" />
          <AdminDashboard />
        </>
      </Route>

      {/* ✅ Admin aliases so /admin and /admin/vendors both work */}
      <Route path="/admin">
        <>
          <RouteProbe tag="admin (alias)" />
          <AdminDashboard />
        </>
      </Route>
      <Route path="/admin/vendors">
        <>
          <RouteProbe tag="admin/vendors (alias)" />
          <AdminDashboard />
        </>
      </Route>

      <Route path="/categories">
        <>
          <RouteProbe tag="categories" />
          <Categories />
        </>
      </Route>

      <Route path="/become-vendor">
        <>
          <RouteProbe tag="become-vendor" />
          <BecomeVendor />
        </>
      </Route>

      <Route path="/support">
        <>
          <RouteProbe tag="support" />
          <Support />
        </>
      </Route>

      {/* Checkout */}
      <Route path="/checkout">
        <>
          <RouteProbe tag="checkout" />
          <Checkout />
        </>
      </Route>

      {/* Catch-all for 404s in wouter v3 */}
      <Route path="*">
        <>
          <RouteProbe tag="not-found" />
          <NotFound />
        </>
      </Route>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        {/* NLe/USD formatter available app-wide */}
        <TooltipProvider>
          {/* overflow-x-hidden prevents horizontal wiggle on mobile */}
          <div className="min-h-screen bg-background overflow-x-hidden">
            <Navbar />
            <main>
              <AppRoutes />
            </main>
            <Footer />
            <CartSidebar />
          </div>
          <Toaster />
        </TooltipProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}
