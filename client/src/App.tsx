// client/src/App.tsx
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/navbar";
import Footer from "@/components/footer";
import { CartSidebar } from "@/components/cart-sidebar";
import { CurrencyProvider } from "@/lib/currency"; // NLe/USD context

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
import NotFound from "@/pages/not-found";

// --- Debug helper so we can see which route rendered ---
import { useEffect } from "react";
function RouteProbe({ tag }: { tag: string }) {
  useEffect(() => {
    // Open DevTools Console to see route mounts
    console.log(`[route] ${tag} mounted`);
  }, [tag]);
  return null;
}

function Router() {
  return (
    <Switch>
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
        {(params) => (
          <>
            <RouteProbe tag={`product ${params.id}`} />
            <ProductDetails params={params as any} />
          </>
        )}
      </Route>

      <Route path="/vendor-dashboard">
        <>
          <RouteProbe tag="vendor-dashboard" />
          <VendorDashboard />
        </>
      </Route>

      {/* TEMP: public admin page so you can see it now */}
      <Route path="/admin-dashboard">
        <>
          <RouteProbe tag="admin-dashboard" />
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

      {/* Catch-all */}
      <Route>
        <>
          <RouteProbe tag="not-found" />
          <NotFound />
        </>
      </Route>
    </Switch>
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
              <Router />
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
