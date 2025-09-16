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

/* --- Optional tiny helper to log which route mounted (debug only) --- */
function RouteProbe({ tag }: { tag: string }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
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

      {/* Product details reads :id via useParams inside the page, so no props here */}
      <Route path="/products/:id">
        {() => (
          <>
            <RouteProbe tag="product-details" />
            <ProductDetails />
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

      {/* Admin aliases so /admin and /admin/vendors both work */}
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

      <Route path="/checkout">
        <>
          <RouteProbe tag="checkout" />
          <Checkout />
        </>
      </Route>

      {/* Catch-all 404 (wouter v3) */}
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
        <TooltipProvider>
          {/* Avoid horizontal scroll-jank across pages */}
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
